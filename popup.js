document.addEventListener("DOMContentLoaded", () => {
  chrome.runtime.sendMessage({ action: "GET_CONFIG" }, (res) => {
    if (res) {
      const { officeInTime, officeOutTime, webClockOutTime, todayDetail } = res;

      document.getElementById("office-in-time").value = officeInTime;
      document.getElementById("office-out-time").value = officeOutTime;
      document.getElementById("effective-working-hours").value =
        webClockOutTime;

      const statusText = findCurrentStatus(res, todayDetail);
      document.getElementById(
        "status"
      ).innerHTML = `<span class="circle"></span> ${statusText}`;
    }
  });

  const findCurrentStatus = (
    { officeInTime, officeOutTime, webClockOutTime },
    todayDetail
  ) => {
    const currentTime = new Date();
    const currentHourMinute = parseInt(
      currentTime.getHours() + ("0" + currentTime.getMinutes()).slice(-2)
    );
    const inTime = parseInt(officeInTime.replace(":", ""));
    const outTime = parseInt(officeOutTime.replace(":", ""));

    if (currentHourMinute >= inTime && currentHourMinute <= outTime) {
      const { webClkInTime, webClkOutTime } = todayDetail || {};

      if (
        webClkInTime &&
        webClkOutTime &&
        currentTime.getTime() - webClkInTime >= webClockOutTime * 3.6e6
      ) {
        return `Clocked out on ${
          new Date(webClkOutTime).toTimeString().split(" ")[0]
        }`;
      }
      if (webClkOutTime) {
        return `Clocked out on ${
          new Date(webClkOutTime).toTimeString().split(" ")[0]
        }`;
      }
      return webClkInTime
        ? `Clocked in on ${new Date(webClkInTime).toTimeString().split(" ")[0]}`
        : "Need to clock in";
    }
    return "Out of office in time";
  };

  document.querySelector("button").addEventListener("click", (event) => {
    event.preventDefault();
    const officeInTime = document.getElementById("office-in-time").value;
    const officeOutTime = document.getElementById("office-out-time").value;
    const webClockOutTime = document.getElementById(
      "effective-working-hours"
    ).value;

    chrome.runtime.sendMessage({
      action: "SAVE_CONFIG",
      data: { officeInTime, officeOutTime, webClockOutTime },
    });
  });
});
