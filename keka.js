const MAX_RETRIES = 5;
let retryCount = 0;
let intervalId;

async function clkIn(type) {
  if (retryCount >= MAX_RETRIES) {
    console.error(`[KekaAuto] Max retries (${MAX_RETRIES}) reached. Stopping.`);
    clearInterval(intervalId);
    return;
  }
  retryCount++;

  const token = localStorage.getItem("access_token");
  if (!token) {
    console.error(
      "[KekaAuto] No access token found. User might not be logged in."
    );
    clearInterval(intervalId);
    return;
  }

  const origin = window.location.origin;

  try {
    const lastLoginTimestamp = await checklastLogin(token, origin);

    if (type === "CLK_IN" && lastLoginTimestamp) {
      console.log("[KekaAuto] Already clocked in. Notifying background.");
      retrySendMessageToBackground(type, lastLoginTimestamp);
      clearInterval(intervalId);
      return;
    }

    const response = await fetch(
      `${origin}/k/attendance/api/mytime/attendance/webclockin`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=UTF-8",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          timestamp: new Date(),
          attendanceLogSource: 1,
          manualClockinType: 1,
          note: "",
          originalPunchStatus: 0,
        }),
      }
    );

    const res = await response.json();

    if (res?.data?.errorMessage || res?.data?.data?.invalidIp) {
      const errorMsg = res.data.errorMessage || res.data.data.invalidIp;
      console.error(`[KekaAuto] API Error: ${errorMsg}`);
    } else {
      console.log(`[KekaAuto] ${type} Success!`);
      retrySendMessageToBackground(type);
      clearInterval(intervalId);
    }
  } catch (err) {
    console.error(`[KekaAuto] Network/Script Error: ${err.message}`);
  }
}

const type = new URLSearchParams(window.location.search).get("type");

if (type === "CLK_IN" || type === "CLK_OUT") {
  console.log(`[KekaAuto] Starting automation for: ${type}`);
  clkIn(type);
  intervalId = setInterval(() => clkIn(type), 5000);
}

function sendMessageToBackground(action, clkInDate) {
  return new Promise((resolve) => {
    if (chrome && chrome.runtime) {
      try {
        chrome.runtime.sendMessage(
          { action: action, clkInDate },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn(
                "[KekaAuto] Runtime error:",
                chrome.runtime.lastError.message
              );
              resolve([]);
            } else {
              resolve(response ? ["s"] : []);
            }
          }
        );
      } catch (e) {
        console.warn("[KekaAuto] Send Message Exception:", e);
        resolve([]);
      }
    } else {
      resolve([]);
    }
  });
}

function retrySendMessageToBackground(action, clkInDate) {
  let messageRetries = 0;
  const MAX_MSG_RETRIES = 5;

  const attemptSend = () => {
    if (messageRetries >= MAX_MSG_RETRIES) return;

    sendMessageToBackground(action, clkInDate).then((result) => {
      if (!result || result.length === 0) {
        messageRetries++;
        setTimeout(attemptSend, 5000);
      }
    });
  };
  attemptSend();
}

async function checklastLogin(token, origin) {
  try {
    const response = await fetch(
      `${origin}/k/dashboard/api/mytime/attendance/attendancedayrequests`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json; charset=UTF-8",
          authorization: `Bearer ${token}`,
        },
      }
    );
    const json = await response.json();
    const data = json.data;

    if (
      data?.webclockin?.length > 0 &&
      data.webclockin[0]?.timeEntries?.length > 0
    ) {
      return data.webclockin[0].timeEntries[0].actualTimestamp;
    }
    return false;
  } catch (err) {
    console.error("[KekaAuto] Check Login Error:", err);
    // If check logic fails (e.g. 404), assume false to attempt clock in,
    // or return false to be safe.
    return false;
  }
}
