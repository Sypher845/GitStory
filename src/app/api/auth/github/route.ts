import { NextRequest, NextResponse } from "next/server";

// Start GitHub OAuth flow
export async function GET(request: NextRequest) {
    const clientId = process.env.GITHUB_CLIENT_ID;

    if (!clientId) {
        return NextResponse.json(
            { error: "GitHub OAuth not configured. Set GITHUB_CLIENT_ID in .env" },
            { status: 500 }
        );
    }

    const origin = request.headers.get("origin") || request.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/github/callback`;

    const authUrl = new URL("https://github.com/login/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "repo read:user");
    authUrl.searchParams.set("allow_signup", "true");

    // CSRF protection
    const state = crypto.randomUUID();
    authUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authUrl.toString());
    response.cookies.set("github_oauth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 10,
    });

    return response;
}
