// ===== GLOBAL VARIABLES & FUNCTIONS FOR CHATBOT =====
let chatbotHistory = [];

// Global callGemini function (moved outside DOMContentLoaded)
window.callGemini = async function (prompt, options = {}, retryCount = 0) {
  const geminiApiKeyInput = document.getElementById("geminiApiKey");

  function getGeminiKey() {
    const key =
      geminiApiKeyInput?.value.trim() ||
      localStorage.getItem("kadak-gemini-key");
    if (!key) throw new Error("⚠️ Please enter your Gemini API key first.");
    return key;
  }

  const key = getGeminiKey();
  const { history = [], temperature = 0.7, system } = options;
  const maxRetries = 3;
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const GEMINI_MODEL_PATHS = [
    {
      label: "gemini-2.5-flash",
      endpoint:
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    },
    {
      label: "gemini-2.5-flash-lite",
      endpoint:
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent",
    },
    {
      label: "gemini-2.5-pro",
      endpoint:
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent",
    },
  ];

  const payload = {
    contents: [
      ...(system ? [{ role: "user", parts: [{ text: system }] }] : []),
      ...(Array.isArray(history) ? history : []),
      { role: "user", parts: [{ text: prompt }] },
    ],
    generationConfig: { temperature, maxOutputTokens: 512 },
  };

  const errors = [];

  for (const model of GEMINI_MODEL_PATHS) {
    try {
      const res = await fetch(
        `${model.endpoint}?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const textBody = await res.text();
      if (!res.ok) {
        if (res.status === 503 && retryCount < maxRetries) {
          console.warn(`Retrying Gemini (attempt ${retryCount + 1})...`);
          await delay(1500 * (retryCount + 1));
          return window.callGemini(prompt, options, retryCount + 1);
        }
        errors.push(`Gemini error (${res.status}): ${textBody}`);
        continue;
      }

      const data = JSON.parse(textBody);
      const parts = data?.candidates?.[0]?.content?.parts;
      const text = Array.isArray(parts)
        ? parts
            .map((p) => p.text)
            .filter(Boolean)
            .join("\n")
            .trim()
        : "";

      if (!text) throw new Error("Gemini returned an empty response.");
      return { text, full: data, model: model.label };
    } catch (e) {
      errors.push(`${model.label}: ${e.message}`);
      continue;
    }
  }

  throw new Error(errors.join(" | ") || "All Gemini models failed.");
};

// Global renderChat function
window.renderChat = function (role, text) {
  const chatbotMessages = document.getElementById("chatbotMessages");
  if (!chatbotMessages) return;

  const msg = document.createElement("div");
  msg.className = `chat-message ${role}`;
  msg.textContent = text;
  chatbotMessages.appendChild(msg);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
};

// Global handleChatPrompt function
window.handleChatPrompt = async function (prompt) {
  if (!prompt) return;

  const chatbotMessages = document.getElementById("chatbotMessages");
  const chatbotPrompt = document.getElementById("chatbotPrompt");

  if (!chatbotMessages) {
    console.error("❌ chatbotMessages element not found!");
    return;
  }

  window.renderChat("user", prompt);

  if (chatbotPrompt) {
    chatbotPrompt.value = "";
  }

  window.renderChat("bot", "☕ Thinking...");

  try {
    const { text } = await window.callGemini(prompt, {
      history: chatbotHistory,
      system:
        "You are Kadak Adda's friendly chai lounge assistant. Keep replies short, warm, and about chai, snacks, and delivery.",
    });

    chatbotHistory.push(
      { role: "user", parts: [{ text: prompt }] },
      { role: "model", parts: [{ text }] }
    );

    if (chatbotMessages.lastChild) {
      chatbotMessages.lastChild.textContent = text;
    }
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  } catch (err) {
    const errorMsg = err.message.includes("503")
      ? "Server is busy, please try again."
      : err.message;

    if (chatbotMessages.lastChild) {
      chatbotMessages.lastChild.textContent = "⚠️ " + errorMsg;
    }
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }
};

// ===== NOW YOUR DOMCONTENTLOADED CODE =====
document.addEventListener("DOMContentLoaded", function () {
  // ===== Scroll Fade Effect =====
  const elements = document.querySelectorAll(".fade-scroll");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("visible");
      });
    },
    { threshold: 0.2 }
  );
  elements.forEach((el) => observer.observe(el));

  // ===== Navigation Toggle =====
  const navToggle = document.getElementById("navToggle");
  const primaryNav = document.getElementById("primaryNav");
  const DESKTOP_BREAKPOINT = 992;

  function closeMobileNav() {
    primaryNav?.classList.remove("open");
    if (navToggle) {
      navToggle.classList.remove("open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  }

  navToggle?.addEventListener("click", () => {
    const isOpen = primaryNav?.classList.toggle("open") ?? false;
    navToggle.classList.toggle("open", isOpen);
    navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  primaryNav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth < DESKTOP_BREAKPOINT) {
        closeMobileNav();
      }
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= DESKTOP_BREAKPOINT) {
      closeMobileNav();
    }
  });

  document.addEventListener("click", (event) => {
    if (!primaryNav || window.innerWidth >= DESKTOP_BREAKPOINT) return;
    if (!primaryNav.classList.contains("open")) return;
    if (
      primaryNav.contains(event.target) ||
      navToggle?.contains(event.target)
    ) {
      return;
    }
    closeMobileNav();
  });

  // ===== Gemini API Setup & Auto-Hide Banner =====
  const geminiApiKeyInput = document.getElementById("geminiApiKey");
  const geminiStatus = document.getElementById("geminiStatus");
  const apiKeyBanner = document.querySelector(".api-key-banner");

  // Function to hide the API banner
  function hideApiBanner() {
    if (apiKeyBanner) {
      apiKeyBanner.style.transition = "opacity 0.3s ease";
      apiKeyBanner.style.opacity = "0";
      setTimeout(() => {
        apiKeyBanner.style.display = "none";
      }, 300);
    }
  }

  // Function to show the API banner
  window.showApiKeyBanner = function () {
    if (apiKeyBanner) {
      apiKeyBanner.style.display = "block";
      apiKeyBanner.style.opacity = "1";
    }
  };

  // Check if API key exists and hide banner on page load
  if (geminiApiKeyInput && geminiStatus) {
    const savedKey = localStorage.getItem("kadak-gemini-key");
    if (savedKey) {
      geminiApiKeyInput.value = savedKey;
      geminiStatus.textContent = "✅ API key loaded from local storage.";
      // Hide the banner if key already exists
      hideApiBanner();
    }

    function setGeminiStatus(msg, isError = false) {
      geminiStatus.textContent = msg;
      geminiStatus.classList.toggle("text-danger", isError);
      geminiStatus.classList.toggle("text-success", !isError);
    }

    // ===== Key Save / Toggle =====
    document.getElementById("saveGeminiKey")?.addEventListener("click", () => {
      const key = geminiApiKeyInput.value.trim();
      if (!key) return setGeminiStatus("Enter a key before saving.", true);
      localStorage.setItem("kadak-gemini-key", key);
      setGeminiStatus("✅ API key saved locally.");

      // Hide banner after successful save
      setTimeout(() => {
        hideApiBanner();
      }, 800);
    });

    document
      .getElementById("toggleGeminiKey")
      ?.addEventListener("click", (e) => {
        const isPass = geminiApiKeyInput.type === "password";
        geminiApiKeyInput.type = isPass ? "text" : "password";
        e.currentTarget.textContent = isPass ? "Hide" : "Show";
      });

    // ===== CHATBOT - SETUP =====
    const chatbotMessages = document.getElementById("chatbotMessages");
    const chatbotForm = document.getElementById("chatbotForm");
    const chatbotPrompt = document.getElementById("chatbotPrompt");

    if (chatbotMessages && chatbotForm && chatbotPrompt) {
      // ===== Form Submit Handler =====
      chatbotForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const prompt = chatbotPrompt.value.trim();
        if (prompt) {
          window.handleChatPrompt(prompt);
        }
      });

      // ===== Clear Chat Button =====
      const clearChatBtn = document.getElementById("clearChatbot");
      if (clearChatBtn) {
        clearChatBtn.addEventListener("click", () => {
          chatbotMessages.innerHTML =
            '<div class="chat-message bot">👋 Hi! I\'m the Kadak Adda assistant. Ask me anything about our chai, snacks, or delivery.</div>';
          chatbotHistory.length = 0;
          chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        });
      }
    }
  }

  // Optional: Add a function to clear API key and show banner again
  window.clearGeminiApiKey = function () {
    localStorage.removeItem("kadak-gemini-key");
    if (geminiApiKeyInput) geminiApiKeyInput.value = "";
    if (geminiStatus) geminiStatus.textContent = "";
    window.showApiKeyBanner();
  };

  // ===== INVENTORY & SALES DASHBOARD LOGIC =====
  const inventoryTable = document.getElementById("inventoryTable");
  const inventoryForm = document.getElementById("inventoryForm");
  const insightsBox = document.getElementById("inventoryInsights");
  const refreshBtn = document.getElementById("refreshInventoryInsights");

  if (inventoryTable && inventoryForm && insightsBox && refreshBtn) {
    const defaultInventoryData = [
      { item: "Masala Chai", stock: 25, sold: 5, reorder: 10 },
      { item: "Ginger Tea", stock: 12, sold: 8, reorder: 8 },
      { item: "Samosa", stock: 40, sold: 20, reorder: 15 },
      { item: "Paneer Sandwich", stock: 10, sold: 3, reorder: 5 },
    ];

    function loadInventory() {
      return (
        JSON.parse(localStorage.getItem("chaiInventory")) ||
        defaultInventoryData
      );
    }

    function saveInventory(data) {
      localStorage.setItem("chaiInventory", JSON.stringify(data));
    }

    function renderInventory() {
      const inventory = loadInventory();
      inventoryTable.innerHTML = "";

      inventory.forEach((item, index) => {
        const tr = document.createElement("tr");
        if (item.stock <= item.reorder) {
          tr.setAttribute("data-low-stock", "true");
        }
        tr.innerHTML = `
          <td>${item.item}</td>
          <td class="text-center">${item.stock}</td>
          <td class="text-center">${item.sold}</td>
          <td class="text-center">${item.reorder}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-danger" data-index="${index}">
              Delete
            </button>
          </td>
        `;
        inventoryTable.appendChild(tr);
      });
    }

    inventoryForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const item = document.getElementById("inventoryItem").value.trim();
      const stock = parseInt(document.getElementById("inventoryStock").value);
      const sold = parseInt(document.getElementById("inventorySold").value);
      const reorder = parseInt(
        document.getElementById("inventoryReorder").value
      );

      if (!item || isNaN(stock) || isNaN(sold) || isNaN(reorder)) {
        alert("Please fill all fields correctly.");
        return;
      }

      let inventory = loadInventory();
      const existingIndex = inventory.findIndex(
        (i) => i.item.toLowerCase() === item.toLowerCase()
      );

      if (existingIndex !== -1) {
        inventory[existingIndex] = { item, stock, sold, reorder };
      } else {
        inventory.push({ item, stock, sold, reorder });
      }

      saveInventory(inventory);
      renderInventory();
      inventoryForm.reset();
    });

    inventoryTable.addEventListener("click", (e) => {
      if (e.target.matches(".btn-outline-danger")) {
        const index = e.target.dataset.index;
        let inventory = loadInventory();
        inventory.splice(index, 1);
        saveInventory(inventory);
        renderInventory();
      }
    });

    refreshBtn.addEventListener("click", () => {
      const inventory = loadInventory();
      let suggestions = [];

      inventory.forEach((item) => {
        if (item.stock <= item.reorder) {
          suggestions.push(
            `⚠️ <strong>${item.item}</strong> is running low (Stock: ${item.stock}). Consider reordering.`
          );
        } else if (item.sold > item.stock * 0.5) {
          suggestions.push(
            `🔥 <strong>${item.item}</strong> is selling fast! (${item.sold} sold today)`
          );
        }
      });

      if (suggestions.length === 0) {
        insightsBox.innerHTML =
          '<p class="text-success mb-0">✅ All inventory levels are healthy!</p>';
      } else {
        insightsBox.innerHTML = `<ul class="mb-0 text-muted small">${suggestions
          .map((s) => `<li>${s}</li>`)
          .join("")}</ul>`;
      }
    });

    renderInventory();
  }

  // ===== AI FEEDBACK INSIGHTS =====
  const feedbackForm = document.getElementById("feedbackForm");
  const feedbackList = document.getElementById("feedbackList");
  const feedbackSummary = document.getElementById("feedbackSummary");

  if (feedbackForm && feedbackList && feedbackSummary) {
    const sentimentBar = document.createElement("div");
    sentimentBar.classList.add("sentiment-bar", "mt-3");
    feedbackSummary.insertAdjacentElement("afterend", sentimentBar);

    loadFeedback();
    updateSentimentAnalysis();

    feedbackForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const name =
        document.getElementById("feedbackName").value.trim() || "Anonymous";
      const rating = parseInt(document.getElementById("feedbackRating").value);
      const notes = document.getElementById("feedbackNotes").value.trim();

      if (!notes) {
        feedbackSummary.innerHTML = `<p class="text-danger small mb-0">⚠️ Please write some feedback before submitting.</p>`;
        return;
      }

      const feedback = {
        name,
        rating,
        notes,
        date: new Date().toLocaleString(),
      };

      saveFeedback(feedback);
      addFeedbackToList(feedback);
      feedbackForm.reset();

      feedbackSummary.innerHTML = `<p class="text-success small mb-0">💡 AI Insight: Thanks ${name}! Your rating (${rating}/5) has been recorded.</p>`;
      updateSentimentAnalysis();
    });

    function saveFeedback(feedback) {
      let feedbacks = JSON.parse(localStorage.getItem("kadakFeedback")) || [];
      feedbacks.unshift(feedback);
      localStorage.setItem("kadakFeedback", JSON.stringify(feedbacks));
    }

    function loadFeedback() {
      const feedbacks = JSON.parse(localStorage.getItem("kadakFeedback")) || [];
      feedbackList.innerHTML = "";
      feedbacks.forEach(addFeedbackToList);
    }

    function addFeedbackToList(feedback) {
      const li = document.createElement("li");
      li.classList.add("border", "rounded", "p-3", "mb-2", "bg-light");
      const stars = "⭐".repeat(feedback.rating);
      li.innerHTML = `
        <strong>${feedback.name}</strong> 
        <span class="text-warning">${stars}</span><br>
        <small class="text-muted d-block mb-1">${feedback.notes}</small>
        <span class="text-secondary small">${feedback.date}</span>
      `;
      feedbackList.prepend(li);
    }

    function updateSentimentAnalysis() {
      const feedbacks = JSON.parse(localStorage.getItem("kadakFeedback")) || [];
      if (feedbacks.length === 0) {
        sentimentBar.innerHTML = `<p class="text-muted small">No feedback yet.</p>`;
        return;
      }

      let positive = 0,
        neutral = 0,
        negative = 0;

      feedbacks.forEach((fb) => {
        const text = fb.notes.toLowerCase();
        if (
          fb.rating >= 4 ||
          text.includes("love") ||
          text.includes("great") ||
          text.includes("awesome")
        ) {
          positive++;
        } else if (
          fb.rating === 3 ||
          text.includes("okay") ||
          text.includes("fine")
        ) {
          neutral++;
        } else {
          negative++;
        }
      });

      const total = feedbacks.length;
      const posPercent = ((positive / total) * 100).toFixed(0);
      const neuPercent = ((neutral / total) * 100).toFixed(0);
      const negPercent = ((negative / total) * 100).toFixed(0);

      sentimentBar.innerHTML = `
        <div class="sentiment-bar-container mt-2">
          <div class="sentiment positive" style="width:${posPercent}%"></div>
          <div class="sentiment neutral" style="width:${neuPercent}%"></div>
          <div class="sentiment negative" style="width:${negPercent}%"></div>
        </div>
        <div class="small text-muted mt-1">
          😊 Positive: ${posPercent}% | 😐 Neutral: ${neuPercent}% | 😞 Negative: ${negPercent}%
        </div>
      `;
    }
  }
});

// ===== Takeaway Popup Logic =====
document.addEventListener("DOMContentLoaded", () => {
  const takeawayModal = document.getElementById("takeawayModal");
  const openTakeaway = document.getElementById("openTakeaway");
  const closeTakeaway = document.getElementById("closeTakeaway");
  const qtyBtns = document.querySelectorAll(".qty-btn");
  const totalItems = document.getElementById("totalItems");
  const totalPrice = document.getElementById("totalPrice");

  if (!openTakeaway || !takeawayModal) return;

  let total = 0;
  const pricePerItem = 30;

  openTakeaway.addEventListener("click", () => {
    takeawayModal.style.display = "flex";
  });

  closeTakeaway.addEventListener("click", () => {
    takeawayModal.style.display = "none";
  });

  window.addEventListener("click", (e) => {
    if (e.target === takeawayModal) takeawayModal.style.display = "none";
  });

  qtyBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const qtySpan = btn.parentElement.querySelector(".qty");
      let qty = parseInt(qtySpan.textContent);
      if (btn.classList.contains("plus")) qty++;
      else if (btn.classList.contains("minus") && qty > 0) qty--;

      qtySpan.textContent = qty;

      const allQtys = document.querySelectorAll(".qty");
      total = 0;
      allQtys.forEach((q) => (total += parseInt(q.textContent)));

      totalItems.textContent = total;
      totalPrice.textContent = total * pricePerItem;
    });
  });
});
