document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("send").addEventListener("click", async () => {
        const emails = document.getElementById("emails").value.split(",");
        const names = document.getElementById("names").value.split(",");


        const subject = document.getElementById("subject").value;
        const message = document.getElementById("message").innerHTML;

        const file = document.getElementById("attachment").files[0];

        try {
            const token = await authenticate();

            for (let i = 0; i < emails.length; i++) {
                const email = emails[i].trim();
                if (!email) continue;

                const name = (names[i] || "").trim();
                const personalizedBody = `Dear ${name},<br><br>${message}`;
                const raw = await createEmail(email, subject, personalizedBody, file);
                await sendEmail(token, raw);
            }


            alert("✅ Emails sent successfully!");
        } catch (error) {
            console.error("❌ Error:", error);
            alert("Error: " + error.message);
        }
    });
});

function authenticate() {
    return new Promise((resolve, reject) => {
        const clientId = "705562488477-m22gsdesn1uph7o11h811i9p3p6r61ds.apps.googleusercontent.com";
        const redirectUri = chrome.identity.getRedirectURL();
        const scope = "https://www.googleapis.com/auth/gmail.send";
        const authUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

        chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, function (redirectedTo) {
            if (chrome.runtime.lastError || !redirectedTo) {
                reject(new Error("Authentication failed"));
                return;
            }

            const accessToken = new URLSearchParams(new URL(redirectedTo).hash.substring(1)).get("access_token");
            if (!accessToken) {
                reject(new Error("No access token found"));
            } else {
                resolve(accessToken);
            }
        });
    });
}

async function createEmail(to, subject, body, file) {
    const boundary = "boundary123";

    let messageParts = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "MIME-Version: 1.0",
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        "",
        `--${boundary}`,
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: 7bit",
        "",
        body
    ];

    if (file) {
        const fileBuffer = await file.arrayBuffer();
        const base64File = arrayBufferToBase64(fileBuffer);

        messageParts.push(
            `--${boundary}`,
            `Content-Type: ${file.type}; name="${file.name}"`,
            "Content-Transfer-Encoding: base64",
            `Content-Disposition: attachment; filename="${file.name}"`,
            "",
            base64File
        );
    }

    messageParts.push(`--${boundary}--`);

    const fullMessage = messageParts.join("\r\n");
    const encodedMessage = btoa(unescape(encodeURIComponent(fullMessage)));
    return encodedMessage;
}



function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

async function sendEmail(token, raw) {
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ raw })
    });

    if (!res.ok) throw new Error("Gmail API error: " + res.statusText);
}

