"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./auth.module.css";

export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Invalid credentials");
                setLoading(false);
                return;
            }

            // Store token
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));

            // Redirect based on role
            if (data.user.role === "admin") {
                router.push("/admin");
            } else {
                router.push("/dashboard");
            }
        } catch {
            setError("Server error. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>
            {/* Background video */}
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

                <h1 className={styles.title}>Welcome back</h1>
                <p className={styles.subtitle}>Sign in to access your dashboard</p>

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

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        {loading ? (
                            <span className={styles.spinner} />
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>

                <div className={styles.divider}>
                    <span>or</span>
                </div>

                <p className={styles.switchText}>
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className={styles.switchLink}>Create account</Link>
                </p>

                {/* Demo credentials */}
                <div className={styles.demo}>
                    <p>Demo credentials:</p>
                    <button
                        type="button"
                        className={styles.demoBtn}
                        onClick={() => setForm({ email: "admin@aquaviz.com", password: "admin123" })}
                    >
                        Admin — admin@aquaviz.com
                    </button>
                    <button
                        type="button"
                        className={styles.demoBtn}
                        onClick={() => setForm({ email: "user@aquaviz.com", password: "user123" })}
                    >
                        User — user@aquaviz.com
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
