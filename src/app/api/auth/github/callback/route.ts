import { NextRequest, NextResponse } from "next/server";

// Handle GitHub OAuth callback
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const origin = request.headers.get("origin") || request.nextUrl.origin;

    if (error) {
        const errorDescription = searchParams.get("error_description") || "Authorization failed";
        return NextResponse.redirect(`${origin}/chat?error=${encodeURIComponent(errorDescription)}`);
    }

    if (!code) {
        return NextResponse.redirect(`${origin}/chat?error=${encodeURIComponent("No authorization code received")}`);
    }

    // Verify state for CSRF protection
    const storedState = request.cookies.get("github_oauth_state")?.value;
    if (!storedState || storedState !== state) {
        return NextResponse.redirect(`${origin}/chat?error=${encodeURIComponent("Invalid state parameter")}`);
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return NextResponse.redirect(`${origin}/chat?error=${encodeURIComponent("OAuth not configured")}`);
    }

    try {
        // Exchange code for token
        const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: `${origin}/api/auth/github/callback`,
            }),
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            return NextResponse.redirect(
                `${origin}/chat?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`
            );
        }

        const accessToken = tokenData.access_token;

        // Get user info
        const userResponse = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github.v3+json",
            },
        });

        if (!userResponse.ok) {
            return NextResponse.redirect(`${origin}/chat?error=${encodeURIComponent("Failed to fetch user info")}`);
        }

        const userData = await userResponse.json();

        const response = NextResponse.redirect(`${origin}/chat?auth=success`);

        response.cookies.delete("github_oauth_state");

        // Store token in httpOnly cookie
        response.cookies.set("github_access_token", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 30,
            path: "/",
        });

        // Store user info for client to read
        response.cookies.set(
            "github_user",
            JSON.stringify({
                login: userData.login,
                avatar_url: userData.avatar_url,
                name: userData.name,
            }),
            {
                httpOnly: false,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 60 * 60 * 24 * 30,
                path: "/",
            }
        );

        return response;
    } catch (err) {
        console.error("OAuth callback error:", err);
        return NextResponse.redirect(`${origin}/chat?error=${encodeURIComponent("Authentication failed")}`);
    }
}
