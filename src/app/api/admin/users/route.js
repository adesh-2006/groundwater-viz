import { NextResponse } from "next/server";

const users = [
    { id: 1, username: "admin", email: "admin@aquaviz.com", role: "admin", created: "2024-01-15" },
    { id: 2, username: "operator1", email: "op1@aquaviz.com", role: "user", created: "2024-03-22" },
    { id: 3, username: "field_eng", email: "field@aquaviz.com", role: "user", created: "2024-06-10" },
    { id: 4, username: "analyst", email: "analyst@aquaviz.com", role: "user", created: "2024-08-05" },
];

export async function GET() {
    return NextResponse.json(users);
}
