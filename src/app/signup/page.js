"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../login/auth.module.css";

export default function SignupPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "user",
    });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (form.password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: form.username,
                    email: form.email,
                    password: form.password,
                    role: form.role,
                }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Registration failed");
                setLoading(false);
                return;
            }

            // Auto-login after signup
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            router.push("/dashboard");
        } catch {
            setError("Server error. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            <video className={styles.bgVideo} autoPlay loop muted playsInline poster="/images/jungle-bg.png">
                <source src="/images/jungle-fog.mp4" type="video/mp4" />
            </video>
            <div className={styles.bgOverlay} />

            <motion.div
                className={styles.card}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <Link href="/" className={styles.logo}>
                    <div className={styles.logoIcon}>🌿</div>
                    <span>AquaViz</span>
                </Link>

                <h1 className={styles.title}>Create account</h1>
                <p className={styles.subtitle}>Join the groundwater monitoring network</p>

                {error && (
                    <motion.div
                        className={styles.error}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            placeholder="johndoe"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                        />
                    </div>

                    <div className={styles.row}>
                        <div className={styles.field}>
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                required
                            />
                        </div>
                        <div className={styles.field}>
                            <label htmlFor="confirmPassword">Confirm</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={form.confirmPassword}
                                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="role">Role</label>
                        <select
                            id="role"
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                        >
                            <option value="user">User — Viewer Access</option>
                            <option value="admin">Admin — Full Access</option>
                        </select>
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? <span className={styles.spinner} /> : "Create Account"}
                    </button>
                </form>

                <div className={styles.divider}><span>or</span></div>

                <p className={styles.switchText}>
                    Already have an account?{" "}
                    <Link href="/login" className={styles.switchLink}>Sign in</Link>
                </p>
            </motion.div>
        </div>
    );
}
