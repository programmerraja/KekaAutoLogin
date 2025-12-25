document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  const timerEl = document.getElementById("timer");
  const statusBadge = document.getElementById("status-badge");
  const lastSyncEl = document.getElementById("last-sync");
  const holidayCheckbox = document.getElementById("mark-holiday");
  const saveBtn = document.querySelector("button[type='submit']");
  const dayBtns = document.querySelectorAll(".day-btn");

  let timerInterval;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });

  dayBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("selected");
    });
  });

  chrome.runtime.sendMessage({ action: "GET_CONFIG" }, (res) => {
    if (res) {
      const {
        officeInTime,
        officeOutTime,
        webClockOutTime,
        kekaBaseUrl,
        intervalTime,
        leaveDays, // New array from backend
        todayDetail,
      } = res;

      document.getElementById("office-in-time").value = officeInTime;
      document.getElementById("office-out-time").value = officeOutTime;
      document.getElementById("effective-working-hours").value =
        webClockOutTime;
      document.getElementById("keka-url").value =
        kekaBaseUrl || "https://voxyindia.keka.com";

      const intervalMinutes = (intervalTime || 15 * 60000) / 60000;
      document.getElementById("sync-interval").value = intervalMinutes;

      const offDays = leaveDays || [0, 6];
      dayBtns.forEach((btn) => {
        const dayIndex = parseInt(btn.dataset.day);
        if (offDays.includes(dayIndex)) {
          btn.classList.add("selected");
        }
      });

      if (todayDetail) {
        if (todayDetail.isHoliday) {
          holidayCheckbox.checked = true;
          setStatus("Holiday Mode", "holiday");
        } else {
          updateStatusAndTimer(res, todayDetail);
        }
      } else {
        setStatus("No Data Yet", "neutral");
      }

      lastSyncEl.innerText = `Last checked: Just now`;
    }
  });

  holidayCheckbox.addEventListener("change", (e) => {
    const isChecked = e.target.checked;
    chrome.runtime.sendMessage({
      action: "MARK_HOLIDAY",
      isHoliday: isChecked,
    });

    if (isChecked) {
      clearInterval(timerInterval);
      timerEl.innerText = "--:--";
      setStatus("Holiday Mode", "holiday");
    } else {
      chrome.runtime.sendMessage({ action: "GET_CONFIG" }, (res) => {
        updateStatusAndTimer(res, res.todayDetail);
      });
    }
  });

  document.getElementById("config-form").addEventListener("submit", (event) => {
    event.preventDefault();

    const officeInTime = document.getElementById("office-in-time").value;
    const officeOutTime = document.getElementById("office-out-time").value;
    const webClockOutTime = document.getElementById(
      "effective-working-hours"
    ).value;
    const kekaBaseUrl = document.getElementById("keka-url").value;
    const intervalMinutes = document.getElementById("sync-interval").value;

    const leaveDays = [];
    document.querySelectorAll(".day-btn.selected").forEach((btn) => {
      leaveDays.push(parseInt(btn.dataset.day));
    });

    const intervalTime = intervalMinutes * 60000;

    const originalText = saveBtn.innerText;
    saveBtn.innerText = "Saving...";
    saveBtn.disabled = true;

    chrome.runtime.sendMessage(
      {
        action: "SAVE_CONFIG",
        data: {
          officeInTime,
          officeOutTime,
          webClockOutTime,
          kekaBaseUrl,
          intervalTime,
          leaveDays,
        },
      },
      (response) => {
        if (response && response.success) {
          saveBtn.innerText = "Saved!";
          saveBtn.style.backgroundColor = "var(--success-bg)"; // Use variable for dark theme
          saveBtn.style.color = "var(--success-text)";
          setTimeout(() => {
            saveBtn.innerText = originalText;
            saveBtn.style.backgroundColor = "";
            saveBtn.style.color = "";
            saveBtn.disabled = false;
          }, 1500);
        }
      }
    );
  });

  function setStatus(text, type) {
    statusBadge.innerText = text;
    statusBadge.className = "status-badge";
    statusBadge.classList.add(type);
  }

  function updateStatusAndTimer(config, todayDetail) {
    if (!todayDetail) {
      setStatus("Pending Sync", "neutral");
      return;
    }

    const { webClkInTime, webClkOutTime } = todayDetail;

    if (webClkOutTime) {
      setStatus("Clocked Out", "clocked-out");
      const duration = webClkOutTime - webClkInTime;
      timerEl.innerText = formatDuration(duration);
      clearInterval(timerInterval);
      return;
    }

    if (webClkInTime) {
      setStatus("Clocked In", "clocked-in");

      if (timerInterval) clearInterval(timerInterval);

      const updateTimer = () => {
        const now = new Date().getTime();
        const duration = now - webClkInTime;
        timerEl.innerText = formatDuration(duration);
      };

      updateTimer();
      timerInterval = setInterval(updateTimer, 1000);
      return;
    }

    setStatus("Ready to Start", "neutral");
    timerEl.innerText = "--:--";
  }

  function formatDuration(ms) {
    if (!ms || ms < 0) return "00:00:00";
    const seconds = Math.floor((ms / 1000) % 60)
      .toString()
      .padStart(2, "0");
    const minutes = Math.floor((ms / (1000 * 60)) % 60)
      .toString()
      .padStart(2, "0");
    const hours = Math.floor(ms / (1000 * 60 * 60))
      .toString()
      .padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
  }
});
