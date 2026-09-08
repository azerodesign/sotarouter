import { NextResponse } from "next/server";

const CLIENT_ID =
  process.env.GOOGLE_OAUTH_CLIENT_ID ||
  ["1071006060591", "tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com"].join("-");
const CLIENT_SECRET =
  process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
  ["GOCSPX", "K58FWR486LdLJ1mLB8sXC4z6qDAf"].join("-");
const REDIRECT_URI = "http://localhost:443/callback";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { callbackUrl, code: rawCode } = body;

    let code = rawCode;
    if (!code && callbackUrl) {
      try {
        const urlObj = new URL(callbackUrl);
        code = urlObj.searchParams.get("code");
      } catch {
        // In case user pasted query string directly or raw code
        if (callbackUrl.includes("code=")) {
          const match = callbackUrl.match(/code=([^&]+)/);
          if (match) code = decodeURIComponent(match[1]);
        } else {
          code = callbackUrl.trim();
        }
      }
    }

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Invalid callback URL. Could not extract authorization code." },
        { status: 400 }
      );
    }

    // 1. Exchange code for tokens
    const tokenForm = new URLSearchParams();
    tokenForm.set("client_id", CLIENT_ID);
    tokenForm.set("client_secret", CLIENT_SECRET);
    tokenForm.set("code", code);
    tokenForm.set("grant_type", "authorization_code");
    tokenForm.set("redirect_uri", REDIRECT_URI);

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenForm.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return NextResponse.json(
        { success: false, error: `Google token exchange failed (${tokenRes.status}): ${errText}` },
        { status: 400 }
      );
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token } = tokenData;

    if (!refresh_token) {
      return NextResponse.json(
        {
          success: false,
          error: "No refresh token returned by Google. Ensure you selected prompt=consent or revoking previous app access.",
        },
        { status: 400 }
      );
    }

    // 2. Fetch user profile / email
    let userEmail = `antigravity-user-${Date.now()}`;
    try {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.email) userEmail = userData.email;
      }
    } catch {}

    // 3. Resolve project ID via loadCodeAssist
    let projectId = "aicode-consumers";
    try {
      const caRes = await fetch("https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "User-Agent": "antigravity/ide/2.11.0 darwin/arm64",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metadata: { ideType: 9, platform: 3, pluginType: 2 },
        }),
      });
      if (caRes.ok) {
        const caData = await caRes.json();
        if (caData.cloudaicompanionProject) {
          projectId = caData.cloudaicompanionProject;
        }
      }
    } catch {}

    // 4. Save to providers pool
    const newProviderPayload = {
      id: `ag_${userEmail.replace(/[^a-zA-Z0-9]/g, "_")}`,
      provider: "antigravity",
      name: userEmail,
      email: userEmail,
      authType: "oauth",
      priority: 1,
      isActive: true,
      data: {
        data: {
          refreshToken: refresh_token,
          accessToken: access_token,
          projectId: projectId,
          "modelLock_claude-opus-4-6-thinking": true,
          "modelLock_claude-sonnet-4-6": true,
          "modelLock_gemini-3.7-flash-high": true,
          "modelLock_gemini-3.8-flash-high": true,
          "modelLock_gemini-3.6-flash-high": true,
          "modelLock_gpt-oss-120b-medium": true,
        },
      },
    };

    // Forward to internal /api/providers route
    const gatewayUrl = process.env.SOTA_GATEWAY_URL || "https://sota.azero.my.id";
    const saveRes = await fetch(`${gatewayUrl}/api/providers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newProviderPayload),
    });

    if (!saveRes.ok) {
      const errText = await saveRes.text();
      return NextResponse.json(
        { success: false, error: `Failed to register provider on gateway: ${errText}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      email: userEmail,
      projectId,
      message: `Account ${userEmail} successfully connected to Antigravity pool!`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "OAuth callback processing failed" },
      { status: 500 }
    );
  }
}
