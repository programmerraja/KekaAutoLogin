class LocalStorageHelper {
  // chrome.storage.local supports objects directly, no need for JSON wrappers
  async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        let val = result[key];
        // Migration support: invalid/legacy data might be a string
        if (typeof val === 'string') {
            try { val = JSON.parse(val); } catch (e) {
                console.error("Error parsing legacy storage:", e);
                val = {}; 
            }
        }
        resolve(val || {});
      });
    });
  }

  async set(key, data) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: data }, resolve);
    });
  }

  async clear(key) {
    return this.set(key, {});
  }
}

const localStorageHelper = new LocalStorageHelper();

// Global Config Cache
let CONFIG = {};

async function initializeConfig() {
  const configData = await localStorageHelper.get("config");
  
  CONFIG = {
    leaveDays: configData.leaveDays || [0, 6], // Load from storage or default Sat/Sun
    officeInTime: configData.officeInTime || "08:00",
    officeOutTime: configData.officeOutTime || "20:30",
    webClockOutTime: configData.webClockOutTime || 9,
    kekaBaseUrl: configData.kekaBaseUrl || "https://voxyindia.keka.com",
    intervalTime: configData.intervalTime || 15 * 60000, 
    keyName: "clk",
  };
}

async function start() {
  const log = console.log;
  console.log = (...msg) => log(`${new Date().toISOString()} ${JSON.stringify(msg)}`);

  // Initialize Config exactly once
  await initializeConfig();

  const TODAY = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  let todayDetails = (await localStorageHelper.get(CONFIG.keyName)) || {};
  if (!todayDetails[TODAY()]) {
    todayDetails[TODAY()] = {};
  }
  
  // Initial check on startup
  checkAndRun();

  // Alarm Logic
  chrome.alarms.create("openWebsite", { when: Date.now() + CONFIG.intervalTime });
  
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "openWebsite") {
      await checkAndRun();
      // Re-schedule based on current CONFIG interval
      chrome.alarms.create("openWebsite", { when: Date.now() + CONFIG.intervalTime });
    }
  });
  
  async function checkAndRun() {
     const action = await isHitKeka();
      if (action) {
        chrome.tabs.create({
          url: `${CONFIG.kekaBaseUrl}/#/home/dashboard?type=${action}`,
        });
      }
  }

  async function isHitKeka() {
    const now = new Date();
    const currentHourMinute = parseInt(now.getHours() + ("0" + now.getMinutes()).slice(-2));
    const currentDay = now.getDay();
    const todayStr = TODAY();

    if (CONFIG.leaveDays.includes(currentDay)) return null;

    // Refresh details from storage to be safe
    const kekaClkDetails = (await localStorageHelper.get(CONFIG.keyName))[todayStr];

    if (kekaClkDetails && kekaClkDetails.isHoliday) {
        console.log("Today is a Holiday. Skipping.");
        return null;
    }

    const start = parseInt(CONFIG.officeInTime.replace(":", ""));
    const end = parseInt(CONFIG.officeOutTime.replace(":", ""));

    if (currentHourMinute >= start && currentHourMinute <= end) {
      if (kekaClkDetails && kekaClkDetails.webClkInTime) {
        if (!kekaClkDetails.webClkOutTime && (now.getTime() - kekaClkDetails.webClkInTime >= CONFIG.webClockOutTime * 3.6e6)) {
          return "CLK_OUT";
        }
      } else {
        return "CLK_IN";
      }
    }
    return null;
  }

  // Define Message Handler Logic (Async)
  const handleMessage = async (request, sendResponse) => {
      console.log("[MSG] Action", request.action);
      
      switch (request.action) {
        case "CLK_IN":
          todayDetails = (await localStorageHelper.get(CONFIG.keyName)) || {};
          if(!todayDetails[TODAY()]) todayDetails[TODAY()] = {};
          
          todayDetails[TODAY()].webClkInTime = request.clkInDate || new Date().getTime();
          todayDetails[TODAY()].status = "clocked in";
          
          await localStorageHelper.set(CONFIG.keyName, todayDetails);
          sendResponse({ success: true });
          break;

        case "CLK_OUT":
          todayDetails = (await localStorageHelper.get(CONFIG.keyName)) || {};
           if(!todayDetails[TODAY()]) todayDetails[TODAY()] = {};

          todayDetails[TODAY()].webClkOutTime = new Date().getTime();
          todayDetails[TODAY()].status = "clocked out";
          
          await localStorageHelper.set(CONFIG.keyName, todayDetails);
          sendResponse({ success: true });
          break;

        case "MARK_HOLIDAY":
             todayDetails = (await localStorageHelper.get(CONFIG.keyName)) || {};
             if(!todayDetails[TODAY()]) todayDetails[TODAY()] = {};

             todayDetails[TODAY()].isHoliday = request.isHoliday;
             await localStorageHelper.set(CONFIG.keyName, todayDetails);
             sendResponse({ success: true, isHoliday: request.isHoliday });
             break;

        case "SAVE_CONFIG":
          // Update Memory
          CONFIG.officeInTime = request.data.officeInTime;
          CONFIG.officeOutTime = request.data.officeOutTime;
          CONFIG.webClockOutTime = request.data.webClockOutTime;
          CONFIG.leaveDays = request.data.leaveDays || [0, 6]; // Save new leave days
          
          let url = request.data.kekaBaseUrl.trim();
          if(url.endsWith('/')) url = url.slice(0, -1);
          CONFIG.kekaBaseUrl = url;

          const newInterval = parseInt(request.data.intervalTime);
          if (newInterval && newInterval !== CONFIG.intervalTime) {
             console.log(`[Config] Updating Interval to ${newInterval}ms`);
             CONFIG.intervalTime = newInterval;
             chrome.alarms.clear("openWebsite", () => {
                chrome.alarms.create("openWebsite", { when: Date.now() + CONFIG.intervalTime });
             });
          }

          checkAndRun();
          
          // Update Storage (Without JSON stringify wrapper)
          await localStorageHelper.set("config", {
              officeInTime: CONFIG.officeInTime,
              officeOutTime: CONFIG.officeOutTime,
              webClockOutTime: CONFIG.webClockOutTime,
              kekaBaseUrl: CONFIG.kekaBaseUrl,
              intervalTime: CONFIG.intervalTime,
              leaveDays: CONFIG.leaveDays
          });
          sendResponse({ success: true });
          break;

        case "GET_CONFIG":
          todayDetails = (await localStorageHelper.get(CONFIG.keyName)) || {};
          sendResponse({
            officeInTime: CONFIG.officeInTime,
            officeOutTime: CONFIG.officeOutTime,
            webClockOutTime: CONFIG.webClockOutTime,
            kekaBaseUrl: CONFIG.kekaBaseUrl,
            intervalTime: CONFIG.intervalTime,
            leaveDays: CONFIG.leaveDays, 
            todayDetail: todayDetails[TODAY()],
          });
          break;

        default:
          sendResponse(false);
      }
  };

  // Main Listener (Non-Async Wrapper)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      handleMessage(request, sendResponse);
      return true; // Synchronous return required for async sendResponse
  });
}

start();
