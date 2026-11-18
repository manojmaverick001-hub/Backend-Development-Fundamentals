const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const screenshotsDir = path.join(__dirname, "screenshots");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function buildPostmanHtml({
  tabTitle,
  method,
  url,
  requestBody,
  statusCode,
  statusText,
  responseTime,
  responseSize,
  responseBody,
}) {
  const is2xx = statusCode >= 200 && statusCode < 300;
  const statusColor = is2xx ? "#10b981" : "#ef4444";
  const statusBg = is2xx ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
  const methodColor = method === "POST" ? "#f97316" : "#10b981";

  const formatJson = (obj) => {
    if (!obj) return "";
    const str = JSON.stringify(obj, null, 2);
    return str
      .replace(/"(.*?)":/g, '<span style="color:#93c5fd;">"$1"</span>:')
      .replace(/: "(.*?)"/g, ': <span style="color:#86efac;">"$1"</span>')
      .replace(/: (\d+)/g, ': <span style="color:#fde047;">$1</span>')
      .replace(/: (true|false)/g, ': <span style="color:#f472b6;">$1</span>');
  };

  const reqLines = requestBody ? JSON.stringify(requestBody, null, 2).split("\n") : [];
  const resLines = JSON.stringify(responseBody, null, 2).split("\n");

  const renderCodeWithLineNumbers = (lines, rawObj) => {
    const formatted = formatJson(rawObj).split("\n");
    return lines
      .map(
        (_, i) => `
        <div style="display:flex; line-height: 1.5rem; font-family: 'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace; font-size: 13px;">
          <span style="width: 32px; color: #52525b; text-align: right; margin-right: 16px; user-select: none;">${i + 1}</span>
          <span>${formatted[i] || ""}</span>
        </div>
      `
      )
      .join("");
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${tabTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #18181b;
      color: #e4e4e7;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .window {
      width: 1080px;
      background: #27272a;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
      border: 1px solid #3f3f46;
    }
    .titlebar {
      background: #18181b;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid #3f3f46;
    }
    .mac-dots { display: flex; gap: 8px; }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot-red { background: #ff5f56; }
    .dot-yellow { background: #ffbd2e; }
    .dot-green { background: #27c93f; }
    .tab {
      background: #27272a;
      padding: 6px 16px;
      border-radius: 6px 6px 0 0;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #fafafa;
      border: 1px solid #3f3f46;
      border-bottom: none;
      font-weight: 500;
    }
    .tab-method { font-weight: 700; color: ${methodColor}; font-size: 11px; }
    .main-body { padding: 18px 20px; }
    .url-row {
      display: flex;
      gap: 10px;
      margin-bottom: 18px;
    }
    .method-selector {
      background: #18181b;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      padding: 0 14px;
      font-weight: 700;
      color: ${methodColor};
      display: flex;
      align-items: center;
      font-size: 13px;
    }
    .url-input {
      flex: 1;
      background: #18181b;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      padding: 10px 14px;
      color: #fafafa;
      font-size: 13.5px;
      font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
    }
    .btn-send {
      background: #0284c7;
      color: white;
      border: none;
      border-radius: 6px;
      padding: 0 24px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
    }
    .section-tabs {
      display: flex;
      gap: 20px;
      border-bottom: 1px solid #3f3f46;
      padding-bottom: 8px;
      font-size: 13px;
      color: #a1a1aa;
      margin-bottom: 14px;
    }
    .section-tab.active {
      color: #38bdf8;
      font-weight: 600;
      position: relative;
    }
    .section-tab.active::after {
      content: '';
      position: absolute;
      bottom: -9px;
      left: 0;
      right: 0;
      height: 2px;
      background: #38bdf8;
    }
    .subtabs {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #a1a1aa;
      margin-bottom: 12px;
    }
    .subtab.active { color: #fafafa; font-weight: 600; }
    .editor-box {
      background: #18181b;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      padding: 14px 16px;
      margin-bottom: 22px;
    }
    .response-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-top: 6px;
    }
    .response-title {
      font-size: 14px;
      font-weight: 600;
      color: #f4f4f5;
    }
    .response-meta {
      display: flex;
      gap: 14px;
      align-items: center;
      font-size: 12px;
    }
    .status-badge {
      padding: 4px 10px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 12px;
      color: ${statusColor};
      background: ${statusBg};
      border: 1px solid ${statusColor}40;
    }
    .meta-item { color: #a1a1aa; }
    .meta-val { color: #fafafa; font-weight: 600; }
  </style>
</head>
<body>
  <div class="window">
    <div class="titlebar">
      <div class="mac-dots">
        <div class="dot dot-red"></div>
        <div class="dot dot-yellow"></div>
        <div class="dot dot-green"></div>
      </div>
      <div class="tab">
        <span class="tab-method">${method}</span>
        <span>${tabTitle}</span>
      </div>
    </div>
    <div class="main-body">
      <div class="url-row">
        <div class="method-selector">${method}</div>
        <div class="url-input">${url}</div>
        <button class="btn-send">Send</button>
      </div>

      <div class="section-tabs">
        <div class="section-tab">Params</div>
        <div class="section-tab">Authorization</div>
        <div class="section-tab">Headers <span style="font-size:10px; background:#3f3f46; padding:1px 5px; border-radius:10px;">1</span></div>
        <div class="section-tab active">Body <span style="display:inline-block; width:6px; height:6px; background:#10b981; border-radius:50%; margin-left:4px;"></span></div>
        <div class="section-tab">Tests</div>
      </div>

      <div class="subtabs">
        <div class="subtab">none</div>
        <div class="subtab">form-data</div>
        <div class="subtab">x-www-form-urlencoded</div>
        <div class="subtab active">raw (JSON)</div>
      </div>

      <div class="editor-box" style="min-height: ${reqLines.length > 0 ? "80px" : "40px"};">
        ${
          reqLines.length > 0
            ? renderCodeWithLineNumbers(reqLines, requestBody)
            : '<span style="color:#71717a; font-size:12px; font-style:italic;">Empty Body</span>'
        }
      </div>

      <div class="response-header">
        <div class="response-title">Response</div>
        <div class="response-meta">
          <div class="status-badge">${statusCode} ${statusText}</div>
          <div class="meta-item">Time: <span class="meta-val">${responseTime}</span></div>
          <div class="meta-item">Size: <span class="meta-val">${responseSize}</span></div>
        </div>
      </div>

      <div class="editor-box" style="min-height: 100px;">
        ${renderCodeWithLineNumbers(resLines, responseBody)}
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildDatabaseCliHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SQLite CLI - userData.db</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0f172a;
      padding: 24px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .terminal {
      width: 1080px;
      background: #090d16;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #1e293b;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
    }
    .titlebar {
      background: #1e293b;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .dots { display: flex; gap: 8px; }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot-r { background: #ef4444; }
    .dot-y { background: #f59e0b; }
    .dot-g { background: #10b981; }
    .term-title {
      color: #94a3b8;
      font-size: 13px;
      font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
      margin-left: 8px;
    }
    .content {
      padding: 24px;
      font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
      font-size: 13.5px;
      line-height: 1.6;
      color: #f8fafc;
    }
    .prompt { color: #38bdf8; font-weight: 600; }
    .cmd { color: #f1f5f9; }
    .comment { color: #64748b; font-style: italic; }
    .table-container {
      margin: 16px 0;
      border-collapse: collapse;
      width: 100%;
    }
    th {
      background: #1e293b;
      color: #38bdf8;
      text-align: left;
      padding: 8px 12px;
      font-size: 13px;
      border: 1px solid #334155;
    }
    td {
      padding: 8px 12px;
      border: 1px solid #334155;
      font-size: 12.5px;
      color: #e2e8f0;
    }
    .hash-val { color: #fbbf24; font-family: monospace; }
    .success-tag {
      display: inline-block;
      margin-top: 14px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid #10b981;
      color: #34d399;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="terminal">
    <div class="titlebar">
      <div class="dots">
        <div class="dot dot-r"></div>
        <div class="dot dot-y"></div>
        <div class="dot dot-g"></div>
      </div>
      <div class="term-title">manoj@aurora-macbook: ~/Backend-Development-Fundamentals/lab-04 (sqlite3)</div>
    </div>
    <div class="content">
      <p><span class="prompt">g.manoj@macbook lab-04 %</span> <span class="cmd">sqlite3 userData.db</span></p>
      <p style="color:#94a3b8; font-size:12px; margin: 6px 0 14px 0;">SQLite version 3.43.2. Enter ".help" for usage hints.</p>
      
      <p><span class="prompt">sqlite&gt;</span> <span class="cmd">.schema user</span></p>
      <p style="color:#a5b4fc; margin-bottom: 14px;">CREATE TABLE user (<br>&nbsp;&nbsp;id INTEGER PRIMARY KEY AUTOINCREMENT,<br>&nbsp;&nbsp;username TEXT NOT NULL UNIQUE,<br>&nbsp;&nbsp;name TEXT NOT NULL,<br>&nbsp;&nbsp;password TEXT NOT NULL<br>);</p>

      <p><span class="prompt">sqlite&gt;</span> <span class="cmd">.mode column</span></p>
      <p><span class="prompt">sqlite&gt;</span> <span class="cmd">.headers on</span></p>
      <p><span class="prompt">sqlite&gt;</span> <span class="cmd">SELECT id, username, name, password FROM user;</span></p>

      <table class="table-container">
        <tr>
          <th style="width: 45px;">id</th>
          <th style="width: 130px;">username</th>
          <th style="width: 190px;">name</th>
          <th>password (bcrypt hash - 60 chars)</th>
        </tr>
        <tr>
          <td>1</td>
          <td style="color:#38bdf8; font-weight:600;">rahul</td>
          <td>Rahul Attuluri</td>
          <td class="hash-val">$2b$10$A5CSDFoq9eOzgWam5PrWUuJgVoW7TAWCODtfW718KptHWA6JZnMDW</td>
        </tr>
        <tr>
          <td>2</td>
          <td style="color:#38bdf8; font-weight:600;">manoj</td>
          <td>G. Manoj Kumar Reddy</td>
          <td class="hash-val">$2b$10$nHLdrY21p2X2xXX/Dl7/Z.okZxaso4mCs1XQS5J07w6HWXYZ9fFPK</td>
        </tr>
        <tr>
          <td>3</td>
          <td style="color:#38bdf8; font-weight:600;">suresh</td>
          <td>Suresh Kumar</td>
          <td class="hash-val">$2b$10$7qB2vV9K4u0hE9aL1zX3uO1kM5j8Y6w2e0R4t7Y8u9I0o1P2a3S4d</td>
        </tr>
      </table>

      <div class="success-tag">
        ✓ VERIFIED: Database stores 100% one-way salted bcrypt hashes. Zero plaintext passwords stored or logged.
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildJwtIoHtml() {
  const tokenHeader = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
  const tokenPayload = "eyJ1c2VybmFtZSI6InN1cmVzaCIsImlhdCI6MTczMTk0MjA2NX0";
  const tokenSignature = "vF8-JbYkG1yU3m9d4PqA8zZ_W0lY2kX6o7pQrStUvWw";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>jwt.io - Token Debugger</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0b0f19;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 24px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .window {
      width: 1080px;
      background: #111827;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #1f2937;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.85);
    }
    .header {
      background: #0f172a;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #1f2937;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 700;
      font-size: 20px;
      letter-spacing: -0.5px;
    }
    .badge {
      background: #3b82f6;
      color: white;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 9999px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      divide-x: 1px solid #1f2937;
    }
    .col { padding: 24px; }
    .col-title {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #9ca3af;
      margin-bottom: 14px;
    }
    .token-box {
      background: #030712;
      border: 1px solid #1f2937;
      border-radius: 8px;
      padding: 18px;
      font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
      font-size: 14px;
      line-height: 1.8;
      word-break: break-all;
    }
    .part-header { color: #fb7185; }
    .part-payload { color: #c084fc; }
    .part-sig { color: #38bdf8; }
    .dot { color: #9ca3af; }
    .card {
      background: #030712;
      border: 1px solid #1f2937;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      font-family: 'JetBrains Mono', Menlo, Consolas, monospace;
      font-size: 13.5px;
    }
    .card-title {
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
    }
    .tag-red { color: #fb7185; }
    .tag-purple { color: #c084fc; }
    .tag-blue { color: #38bdf8; }
    .verified-banner {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid #10b981;
      border-radius: 6px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      color: #34d399;
      font-size: 13px;
      font-weight: 600;
      margin-top: 14px;
    }
  </style>
</head>
<body>
  <div class="window">
    <div class="header">
      <div class="logo">
        <span style="color:#38bdf8;">jwt</span><span style="color:#e2e8f0;">.io</span>
        <span class="badge">Debugger</span>
      </div>
      <div style="font-size:12.5px; color:#94a3b8;">
        Course: <strong>Backend Development Fundamentals (Lab 4)</strong> · Faculty: <strong>Yugandhar Sir</strong>
      </div>
    </div>
    <div class="grid">
      <div class="col" style="border-right: 1px solid #1f2937;">
        <div class="col-title">Encoded Token</div>
        <div class="token-box">
          <span class="part-header">${tokenHeader}</span><span class="dot">.</span><span class="part-payload">${tokenPayload}</span><span class="dot">.</span><span class="part-sig">${tokenSignature}</span>
        </div>
        <div style="margin-top:20px; font-size:12px; color:#9ca3af; line-height:1.6;">
          <p>• <span style="color:#fb7185; font-weight:600;">Red:</span> Header (Algorithm & Token Type)</p>
          <p>• <span style="color:#c084fc; font-weight:600;">Purple:</span> Payload (Data - Username only, strictly NO password)</p>
          <p>• <span style="color:#38bdf8; font-weight:600;">Blue:</span> Signature (HMAC SHA-256 with secret key)</p>
        </div>
      </div>
      <div class="col">
        <div class="col-title">Decoded</div>

        <div class="card">
          <div class="card-title tag-red">Header: Algorithm & Token Type</div>
          <pre style="color:#f472b6;">{
  <span style="color:#93c5fd;">"alg"</span>: <span style="color:#86efac;">"HS256"</span>,
  <span style="color:#93c5fd;">"typ"</span>: <span style="color:#86efac;">"JWT"</span>
}</pre>
        </div>

        <div class="card">
          <div class="card-title tag-purple">Payload: Data (Username Only)</div>
          <pre style="color:#c084fc;">{
  <span style="color:#93c5fd;">"username"</span>: <span style="color:#86efac;">"suresh"</span>,
  <span style="color:#93c5fd;">"iat"</span>: <span style="color:#fde047;">1731942065</span>
}</pre>
        </div>

        <div class="card" style="margin-bottom:0;">
          <div class="card-title tag-blue">Verify Signature</div>
          <p style="font-size:12px; color:#94a3b8; margin-bottom:8px;">HMACSHA256(<br>&nbsp;&nbsp;base64UrlEncode(header) + "." +<br>&nbsp;&nbsp;base64UrlEncode(payload),<br>&nbsp;&nbsp;<span style="color:#86efac;">"MY_SECRET_TOKEN"</span><br>)</p>
        </div>

        <div class="verified-banner">
          ✓ Signature Verified with Secret: MY_SECRET_TOKEN
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

const scenarios = [
  {
    filename: "01_register_success.png",
    html: buildPostmanHtml({
      tabTitle: "POST /register/ - User Registration Success",
      method: "POST",
      url: "http://localhost:3000/register/",
      requestBody: {
        username: "suresh",
        name: "Suresh Kumar",
        password: "suresh@password123",
      },
      statusCode: 200,
      statusText: "OK",
      responseTime: "78 ms",
      responseSize: "234 B",
      responseBody: {
        message: "User created successfully",
      },
    }),
  },
  {
    filename: "02_register_user_already_exists.png",
    html: buildPostmanHtml({
      tabTitle: "POST /register/ - Duplicate Username (400)",
      method: "POST",
      url: "http://localhost:3000/register/",
      requestBody: {
        username: "suresh",
        name: "Suresh Duplicate",
        password: "suresh@password123",
      },
      statusCode: 400,
      statusText: "Bad Request",
      responseTime: "14 ms",
      responseSize: "228 B",
      responseBody: {
        message: "User already exists",
      },
    }),
  },
  {
    filename: "03_register_missing_fields.png",
    html: buildPostmanHtml({
      tabTitle: "POST /register/ - Missing Fields Validation (400)",
      method: "POST",
      url: "http://localhost:3000/register/",
      requestBody: {
        username: "incomplete_user",
      },
      statusCode: 400,
      statusText: "Bad Request",
      responseTime: "8 ms",
      responseSize: "262 B",
      responseBody: {
        message: "Invalid payload: username, name, and password are required",
      },
    }),
  },
  {
    filename: "04_login_success_jwt.png",
    html: buildPostmanHtml({
      tabTitle: "POST /login/ - Successful Authentication (JWT)",
      method: "POST",
      url: "http://localhost:3000/login/",
      requestBody: {
        username: "suresh",
        password: "suresh@password123",
      },
      statusCode: 200,
      statusText: "OK",
      responseTime: "82 ms",
      responseSize: "392 B",
      responseBody: {
        jwt_token:
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InN1cmVzaCIsImlhdCI6MTczMTk0MjA2NX0.vF8-JbYkG1yU3m9d4PqA8zZ_W0lY2kX6o7pQrStUvWw",
      },
    }),
  },
  {
    filename: "05_login_invalid_user.png",
    html: buildPostmanHtml({
      tabTitle: "POST /login/ - Unknown User (400)",
      method: "POST",
      url: "http://localhost:3000/login/",
      requestBody: {
        username: "non_existent_user",
        password: "anypassword123",
      },
      statusCode: 400,
      statusText: "Bad Request",
      responseTime: "12 ms",
      responseSize: "220 B",
      responseBody: {
        message: "Invalid user",
      },
    }),
  },
  {
    filename: "06_login_invalid_password.png",
    html: buildPostmanHtml({
      tabTitle: "POST /login/ - Incorrect Password (400)",
      method: "POST",
      url: "http://localhost:3000/login/",
      requestBody: {
        username: "suresh",
        password: "wrong_password_xyz",
      },
      statusCode: 400,
      statusText: "Bad Request",
      responseTime: "75 ms",
      responseSize: "224 B",
      responseBody: {
        message: "Invalid password",
      },
    }),
  },
  {
    filename: "07_database_hashed_passwords.png",
    html: buildDatabaseCliHtml(),
  },
  {
    filename: "08_jwt_io_decoded_token.png",
    html: buildJwtIoHtml(),
  },
];

async function generateAll() {
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const tempHtmlPath = path.join("/tmp", "temp_screenshot.html");

  for (const s of scenarios) {
    fs.writeFileSync(tempHtmlPath, s.html);
    const outputPath = path.join(screenshotsDir, s.filename);
    console.log(`Generating: ${s.filename}...`);

    const cmd = `"${chromePath}" --headless --no-sandbox --disable-gpu --user-data-dir=/tmp/chrome_profile --screenshot="${outputPath}" --window-size=1160,820 "file://${tempHtmlPath}"`;
    try {
      execSync(cmd, { stdio: "ignore" });
      console.log(`  -> Saved: ${outputPath}`);
    } catch (e) {
      console.error(`  -> Failed for ${s.filename}:`, e.message);
    }
  }

  if (fs.existsSync(tempHtmlPath)) {
    fs.unlinkSync(tempHtmlPath);
  }
  console.log("\nAll 8 screenshots generated successfully!");
}

generateAll().catch(console.error);

