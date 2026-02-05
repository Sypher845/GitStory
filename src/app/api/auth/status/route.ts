import { NextRequest, NextResponse } from "next/server";

// Check auth status
export async function GET(request: NextRequest) {
    const accessToken = request.cookies.get("github_access_token")?.value;
    const userCookie = request.cookies.get("github_user")?.value;

    if (!accessToken) {
        return NextResponse.json({
            authenticated: false,
            user: null,
            accessToken: null,
        });
    }

    let user = null;
    if (userCookie) {
        try {
            user = JSON.parse(userCookie);
        } catch {
            // ignore
        }
    }

    return NextResponse.json({
        authenticated: true,
        user,
        accessToken,
    });
}

// Logout
export async function DELETE() {
    const response = NextResponse.json({ success: true });
    response.cookies.delete("github_access_token");
    response.cookies.delete("github_user");
    return response;
}
