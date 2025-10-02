class LocalStorageHelper {
  async get(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        // console.log("[LocalStorageHelper][GET]", result);
        resolve(result[key] ? JSON.parse(result[key]) : {});
      });
    });
  }

  async set(key, data) {
    // console.log("[LocalStorageHelper][SET]", data);
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: JSON.stringify(data) }, resolve);
    });
  }

  async clear(key) {
    // console.log("[LocalStorageHelper][CLEAR]");
    return this.set(key, {});
  }
}

const localStorageHelper = new LocalStorageHelper();

async function start() {
  const log = console.log;

  console.log = (...msg) =>
    log(`${new Date().toISOString()} ${JSON.stringify(msg)}`);

  const TODAY = () => new Date().toISOString().split("T")[0];

  const configData = await localStorageHelper.get("config");

  const CONFIG = {
    leaveDays: [0, 6],
    officeInTime: configData.officeInTime || "08:00",
    officeOutTime: configData.officeOutTime || "20:30",
    webClockOutTime: configData.webClockOutTime || 9,
    intervalTime: 15 * 60000, // 15 minutes
    keyName: "clk",
  };

  let todayDetails = (await localStorageHelper.get(CONFIG.keyName)) || {};

  canIClkInOrClkOut(isHitKeka);

  chrome.alarms.create("openWebsite", {
    when: Date.now() + CONFIG.intervalTime,
  });

  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "openWebsite") {
      const action = await isHitKeka();
      // console.log("ISHIT KEKA", action);
      if (action) {
        chrome.tabs.create({
          url: `https://klenty.keka.com/#/home/dashboard?type=${action}`,
        });
      }
      chrome.alarms.create("openWebsite", {
        when: Date.now() + CONFIG.intervalTime,
      });
    }
  });

  chrome.runtime.onMessage.addListener(
    async (request, sender, sendResponse) => {
      console.log("[MSG] Action", request.action);
      switch (request.action) {
        case "CLK_IN":
          todayDetails[TODAY()] = {
            webClkInTime: request.clkInDate || new Date().getTime(),
            status: "clocked in",
          };
          await localStorageHelper.set(CONFIG.keyName, {
            [TODAY()]: todayDetails[TODAY()],
          });
          sendResponse({ success: true });
          break;

        case "CLK_OUT":
          const previousDetails = await localStorageHelper.get(CONFIG.keyName);
          todayDetails[TODAY()].webClkInTime =
            previousDetails[TODAY()].webClkInTime;
          todayDetails[TODAY()].webClkOutTime = new Date().getTime();
          todayDetails[TODAY()].status = "clocked out";
          await localStorageHelper.set(CONFIG.keyName, {
            [TODAY()]: todayDetails[TODAY()],
          });
          sendResponse({ success: true });
          break;

        case "SAVE_CONFIG":
          CONFIG.officeInTime = request.data.officeInTime;
          CONFIG.officeOutTime = request.data.officeOutTime;
          CONFIG.webClockOutTime = request.data.webClockOutTime;
          canIClkInOrClkOut(isHitKeka);
          await localStorageHelper.set("config", request.data);
          sendResponse({ success: true });
          break;

        case "GET_CONFIG":
          sendResponse({
            officeInTime: CONFIG.officeInTime,
            officeOutTime: CONFIG.officeOutTime,
            webClockOutTime: CONFIG.webClockOutTime,
            todayDetail: todayDetails[TODAY()],
          });
          break;

        default:
          sendResponse(false);
      }
    }
  );

  async function isHitKeka() {
    const now = new Date();
    const currentHourMinute = parseInt(
      now.getHours() + ("0" + now.getMinutes()).slice(-2)
    );
    const currentDay = now.getDay();

    if (CONFIG.leaveDays.includes(currentDay)) {
      await localStorageHelper.clear(CONFIG.keyName);
      return null;
    }

    if (
      currentHourMinute >= parseInt(CONFIG.officeInTime.replace(":", "")) &&
      currentHourMinute <= parseInt(CONFIG.officeOutTime.replace(":", ""))
    ) {
      const kekaClkDetails = (await localStorageHelper.get(CONFIG.keyName))[
        TODAY()
      ];
      if (kekaClkDetails && kekaClkDetails.webClkInTime) {
        if (
          !kekaClkDetails.webClkOutTime &&
          now.getTime() - kekaClkDetails.webClkInTime >=
            CONFIG.webClockOutTime * 3.6e6
        ) {
          return "CLK_OUT";
        }
      } else {
        return "CLK_IN";
      }
    } else {
      console.log("Not reached office");
    }
    return null;
  }
}

start();

async function canIClkInOrClkOut(isHitKeka) {
  const action = await isHitKeka();

  if (action) {
    chrome.tabs.create({
      url: `https://klenty.keka.com/#/home/dashboard?type=${action}`,
    });
  }
}
