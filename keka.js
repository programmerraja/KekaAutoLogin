let intervalId;
async function clkIn(type) {
  const clkInDate = await checklastLogin();
  if (clkInDate && type === "CLK_IN") {
    retrySendMessageToBackground(type, clkInDate);
    clearInterval(intervalId);
    return;
  }
  fetch(
    "https://klenty.keka.com/k/attendance/api/mytime/attendance/webclockin",
    {
      body: JSON.stringify({
        timestamp: new Date(),
        attendanceLogSource: 1,
        manualClockinType: 1,
        note: "",
        originalPunchStatus: 0,
      }),
      method: "POST",
      headers: {
        "content-type": "application/json; charset=UTF-8",
        authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    }
  )
    .then((res) => {
      return res.json();
    })
    .then((res) => {
      if (
        res &&
        res.data &&
        (res.data.errorMessage || (res.data.data && res.data.data.invalidIp))
      ) {
        alert(res.data.errorMessage || res.data.data.invalidIp);
      } else {
        retrySendMessageToBackground(type);
        clearInterval(intervalId);
      }
    })
    .catch((err) => {
      alert(err.message);
    });
}

const type = location.href.split("type=").pop();

if ((type && type == "CLK_IN") || type === "CLK_OUT") {
  intervalId = setInterval(() => clkIn(type), 5000);
}

function sendMessageToBackground(action, clkInDate) {
  return new Promise((res, rej) => {
    if (chrome && chrome.runtime) {
      chrome.runtime.sendMessage(
        { action: action, clkInDate },
        (response, err) => {
          if (err) {
            res([]);
          } else {
            res(["s"]);
          }
        }
      );
    } else {
      res([]);
    }
  });
}

function retrySendMessageToBackground(action, clkInDate) {
  sendMessageToBackground(action, clkInDate).then((result) => {
    if (result.length === 0) {
      setTimeout(() => retrySendMessageToBackground(action), 5000);
    }
  });
}

function checklastLogin() {
  return fetch(
    "https://klenty.keka.com/k/dashboard/api/mytime/attendance/attendancedayrequests",
    {
      method: "GET",
      headers: {
        "content-type": "application/json; charset=UTF-8",
        authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
    }
  )
    .then((res) => {
      return res.json();
    })
    .then((res) => {
      console.log("[KEKA] RES JSON", res);
      res = res["data"];
      if (
        res &&
        res["webclockin"] &&
        res["webclockin"].length &&
        res["webclockin"][0]["timeEntries"] &&
        res["webclockin"][0]["timeEntries"].length
      ) {
        return res["webclockin"][0]["timeEntries"][0]["actualTimestamp"];
      }
    })
    .catch((err) => {
      return false;
    });
}
