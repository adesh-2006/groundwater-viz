import { NextResponse } from "next/server";

// Demo user database (in production, use real DB)
const users = [
    { id: 1, username: "admin", email: "admin@aquaviz.com", password: "admin123", role: "admin", created: "2024-01-15" },
    { id: 2, username: "user", email: "user@aquaviz.com", password: "user123", role: "user", created: "2024-03-22" },
];

export async function POST(request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        const user = users.find((u) => u.email === email && u.password === password);

        if (!user) {
            return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        // Generate simple token (in production, use JWT)
        const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString("base64");

        return NextResponse.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });
    } catch {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
