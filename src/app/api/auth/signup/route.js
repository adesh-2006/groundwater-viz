import { NextResponse } from "next/server";

// In-memory user store (in production, use real DB)
let nextId = 10;

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, email, password, role } = body;

        if (!username || !email || !password) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        // Simulate creating user
        const newUser = {
            id: nextId++,
            username,
            email,
            role: role || "user",
        };

        const token = Buffer.from(`${newUser.id}:${email}:${Date.now()}`).toString("base64");

        return NextResponse.json({
            token,
            user: newUser,
        });
    } catch {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
