# 🤖 KekaBuddy — Your Smart Attendance Assistant

> **Never forget to Clock-In or Clock-Out again.**  
> KekaBuddy automates your daily Keka attendance with smart checks, holiday management, and a sleek dark mode.

## ✨ Features

- **⏱️ Auto Clock-In & Out**: Automatically performs actions based on your office hours.
- **🎯 Smart Target Tracking**: Calculates exactly when you've hit your daily work hours (e.g., 9h).
- **🏖️ Holiday Mode**: Taking a leave? Toggle "Holiday Mode" to skip automation for the day.
- **📅 Custom Weekly Offs**: Configurable weekends/off-days (e.g., Sat-Sun or just Sun).
- **🌗 Dark Mode**: A beautiful, eye-friendly dark interface.
- **🔒 Privacy First**: All data is stored **locally** in your browser. No external servers.
- **🌍 Universal Support**: Works with **any** Keka subdomain (e.g., `mycompany.keka.com`).

## 🚀 Installation

Since this is a custom extension, you need to load it manually:

1.  **Download/Clone** this repository to your computer.
2.  Open Chrome and go to `chrome://extensions`.
3.  Enable **Developer Mode** (toggle in the top-right corner).
4.  Click **Load Unpacked**.
5.  Select the folder where you downloaded this code.
6.  🎉 **Done!** You should see the KekaBuddy icon in your toolbar.

## ⚙️ Configuration Guide

Click the extension icon to open the dashboard.

### 1. **Set Up (First Run)**

- Go to the **Settings** tab.
- **Keka URL**: Enter your company's full URL (e.g., `https://voxyindia.keka.com`).
- **Office In/Out**: Set the window during which you want to attempt Clock In/Out.
- **Weekly Offs**: Click the days (S, M, T...) to mark your weekly holidays (Selected = Off).
- Click **Save Settings**.

### 2. **Daily Usage**

- The extension runs in the background.
- It checks everyday if it's a weekday and within office hours.
- If you haven't clocked in, it opens a tab, clocks you in, and closes it.
- Once your **Target Hours** are met, it will auto-clock you out!

## ❓ FAQ

**Q: Will it run if my laptop is closed?**  
A: No. Your browser must be open for the automation to trigger.

**Q: What if I am on leave today?**  
A: Open the extension dashboard and toggle **"Mark Today as Leave/Holiday"**. It will pause for 24 hours.

**Q: Does it steal my password?**  
A: **No.** It uses your active browser session. You must be logged into Keka once for it to grab the token.

Made with ❤️ for productivity.
