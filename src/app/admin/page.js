"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

const TABS = ["overview", "users", "sensors", "readings"];

export default function AdminPage() {
    const router = useRouter();
    const [tab, setTab] = useState("overview");
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [sensors, setSensors] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [modal, setModal] = useState(null); // 'addUser' | 'editUser' | 'addSensor' | 'editSensor' | 'pushReading'
    const [editItem, setEditItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [toast, setToast] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (!stored) { router.push("/login"); return; }
        const u = JSON.parse(stored);
        if (u.role !== "admin") { router.push("/dashboard"); return; }
        setUser(u);
        fetchData();
    }, [router]);

    function showToast(msg, type = "success") {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }

    async function fetchData() {
        setLoading(true);
        try {
            const [statsRes, usersRes, sensorsRes] = await Promise.all([
                fetch("/api/admin/stats"),
                fetch("/api/admin/users"),
                fetch("/api/admin/sensors"),
            ]);
            setStats(await statsRes.json());
            setUsers(await usersRes.json());
            setSensors(await sensorsRes.json());
        } catch {
            setStats({ totalUsers: 24, totalSensors: 15, activeSensors: 12, criticalReadings: 3 });
            setUsers([
                { id: 1, username: "admin", email: "admin@aquaviz.com", role: "admin", created: "2024-01-15" },
                { id: 2, username: "operator1", email: "op1@aquaviz.com", role: "user", created: "2024-03-22" },
                { id: 3, username: "field_eng", email: "field@aquaviz.com", role: "user", created: "2024-06-10" },
                { id: 4, username: "analyst", email: "analyst@aquaviz.com", role: "admin", created: "2024-08-05" },
                { id: 5, username: "viewer1", email: "viewer@aquaviz.com", role: "viewer", created: "2024-09-12" },
            ]);
            setSensors([
                { id: "DWLR-DL-001", name: "New Delhi Station", district: "Central Delhi", state: "Delhi", status: "active", depth: 45, lat: 28.6139, lng: 77.209, lastReading: "14.2m", lastUpdated: "2 min ago" },
                { id: "DWLR-MH-001", name: "Mumbai Station", district: "Mumbai", state: "Maharashtra", status: "active", depth: 32, lat: 19.076, lng: 72.877, lastReading: "8.7m", lastUpdated: "5 min ago" },
                { id: "DWLR-MH-002", name: "Pune Station", district: "Pune", state: "Maharashtra", status: "critical", depth: 60, lat: 18.520, lng: 73.856, lastReading: "22.1m", lastUpdated: "1 min ago" },
                { id: "DWLR-KA-001", name: "Bangalore Station", district: "Bangalore Urban", state: "Karnataka", status: "active", depth: 38, lat: 12.971, lng: 77.594, lastReading: "11.5m", lastUpdated: "8 min ago" },
                { id: "DWLR-RJ-001", name: "Jaipur Station", district: "Jaipur", state: "Rajasthan", status: "critical", depth: 72, lat: 26.912, lng: 75.787, lastReading: "28.3m", lastUpdated: "3 min ago" },
                { id: "DWLR-UP-001", name: "Lucknow Station", district: "Lucknow", state: "Uttar Pradesh", status: "active", depth: 28, lat: 26.846, lng: 80.946, lastReading: "9.8m", lastUpdated: "12 min ago" },
            ]);
        }
        setLoading(false);
    }

    // ── User CRUD ──────────────────────────────────
    function openAddUser() {
        setFormData({ username: "", email: "", password: "", role: "user" });
        setModal("addUser");
    }

    function openEditUser(u) {
        setEditItem(u);
        setFormData({ username: u.username, email: u.email, role: u.role, password: "" });
        setModal("editUser");
    }

    function saveUser() {
        if (!formData.username || !formData.email) { showToast("Fill all required fields", "error"); return; }
        if (modal === "addUser") {
            if (!formData.password) { showToast("Password is required", "error"); return; }
            const newUser = {
                id: Date.now(),
                username: formData.username,
                email: formData.email,
                role: formData.role,
                created: new Date().toISOString().split("T")[0],
            };
            setUsers([newUser, ...users]);
            showToast(`User '${newUser.username}' created`);
        } else {
            setUsers(users.map(u => u.id === editItem.id ? { ...u, ...formData } : u));
            showToast(`User '${formData.username}' updated`);
        }
        setModal(null);
    }

    function deleteUser(id, name) {
        if (!confirm(`Delete user '${name}'? This cannot be undone.`)) return;
        setUsers(users.filter(u => u.id !== id));
        showToast(`User '${name}' deleted`);
    }

    function toggleRole(u) {
        const newRole = u.role === "admin" ? "user" : "admin";
        setUsers(users.map(x => x.id === u.id ? { ...x, role: newRole } : x));
        showToast(`${u.username} is now ${newRole}`);
    }

    // ── Sensor CRUD ──────────────────────────────────
    function openAddSensor() {
        setFormData({ id: "", name: "", district: "", state: "", depth: "", lat: "", lng: "", status: "active" });
        setModal("addSensor");
    }

    function openEditSensor(s) {
        setEditItem(s);
        setFormData({ id: s.id, name: s.name, district: s.district, state: s.state, depth: s.depth, lat: s.lat, lng: s.lng, status: s.status });
        setModal("editSensor");
    }

    async function saveSensor() {
        if (!formData.name || !formData.state) { showToast("Fill all required fields", "error"); return; }
        try {
            if (modal === "addSensor") {
                const res = await fetch("/api/admin/sensors", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "add", sensor_id: formData.id, ...formData }),
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Failed to add sensor");
                showToast(`Sensor '${formData.id}' added`);
            } else {
                const res = await fetch("/api/admin/sensors", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sensor_id: editItem.id, ...formData }),
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || "Failed to update sensor");
                showToast(`Sensor '${formData.id}' updated`);
            }
            setModal(null);
            fetchData(); // Refresh from server
        } catch (err) {
            showToast(err.message, "error");
        }
    }

    async function deleteSensor(id) {
        if (!confirm(`Delete sensor '${id}'? All readings will be lost.`)) return;
        try {
            const res = await fetch(`/api/admin/sensors?id=${encodeURIComponent(id)}`, { method: "DELETE" });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Failed to delete");
            showToast(`Sensor '${id}' deleted`);
            fetchData(); // Refresh from server
        } catch (err) {
            showToast(err.message, "error");
        }
    }

    function openPushReading(s) {
        setEditItem(s);
        setFormData({ water_level: "", ph: "7.0", tds: "", temperature: "25", quality_status: "Good" });
        setModal("pushReading");
    }

    async function pushReading() {
        if (!formData.water_level) { showToast("Water level is required", "error"); return; }
        try {
            const res = await fetch("/api/admin/sensors", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "push-reading",
                    sensor_id: editItem.id,
                    water_level: formData.water_level,
                    ph: formData.ph,
                    tds: formData.tds,
                    temperature: formData.temperature,
                }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Failed to push reading");
            showToast(`Reading pushed for '${editItem.id}' — reflected on user dashboard`);
            setModal(null);
            fetchData(); // Refresh from server
        } catch (err) {
            showToast(err.message, "error");
        }
    }

    function logout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
    }

    if (!user || loading) {
        return (
            <div className={styles.loadingPage}>
                <div className={styles.loadingSpinner} />
                <p>Loading admin panel...</p>
            </div>
        );
    }

    const adminCount = users.filter(u => u.role === "admin").length;
    const userCount = users.filter(u => u.role === "user").length;
    const activeSensors = sensors.filter(s => s.status === "active").length;
    const criticalSensors = sensors.filter(s => s.status === "critical").length;

    return (
        <div className={styles.layout}>
            {/* ── Sidebar ─── */}
            <aside className={styles.sidebar}>
                <Link href="/" className={styles.sidebarLogo}>
                    <div className={styles.logoIcon}>AV</div>
                    <span>AquaViz</span>
                </Link>

                <nav className={styles.sidebarNav}>
                    {TABS.map(t => (
                        <button
                            key={t}
                            className={`${styles.navItem} ${tab === t ? styles.navActive : ""}`}
                            onClick={() => setTab(t)}
                        >
                            <span className={styles.navIcon}>
                                {t === "overview" ? "◈" : t === "users" ? "◉" : t === "sensors" ? "◎" : "◇"}
                            </span>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <div className={styles.avatar}>{user.username?.[0]?.toUpperCase() || "A"}</div>
                        <div>
                            <p className={styles.userName}>{user.username}</p>
                            <p className={styles.userRole}>Administrator</p>
                        </div>
                    </div>
                    <button onClick={logout} className={styles.logoutBtn}>Sign Out</button>
                </div>
            </aside>

            {/* ── Main ─── */}
            <main className={styles.main}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.pageTitle}>
                            {tab === "overview" ? "Admin Overview" : tab === "users" ? "User Management" : tab === "sensors" ? "Sensor Management" : "Push Readings"}
                        </h1>
                        <p className={styles.pageSubtitle}>
                            {tab === "overview" ? "System health and key metrics"
                                : tab === "users" ? "Add, edit, promote and remove users"
                                    : tab === "sensors" ? "Monitor, add, edit and remove DWLR sensors"
                                        : "Push manual readings to sensors"}
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        {tab === "users" && <button onClick={openAddUser} className={styles.addBtn}>+ Add User</button>}
                        {tab === "sensors" && <button onClick={openAddSensor} className={styles.addBtn}>+ Add Sensor</button>}
                        <button onClick={fetchData} className={styles.refreshBtn}>Refresh</button>
                    </div>
                </header>

                {/* ── Overview Tab ─── */}
                {tab === "overview" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className={styles.statsGrid}>
                            {[
                                { label: "Total Users", value: users.length, color: "#3dd68c" },
                                { label: "Admins", value: adminCount, color: "#e5a035" },
                                { label: "Active Sensors", value: activeSensors, color: "#4db8db" },
                                { label: "Critical Alerts", value: criticalSensors, color: "#d94f4f" },
                            ].map((s, i) => (
                                <div key={i} className={styles.statCard}>
                                    <p className={styles.statLabel}>{s.label}</p>
                                    <p className={styles.statValue} style={{ color: s.color }}>{s.value}</p>
                                </div>
                            ))}
                        </div>

                        <div className={styles.recentSection}>
                            <h3>Recent Activity</h3>
                            <div className={styles.activityList}>
                                {[
                                    { text: "Sensor DWLR-MH-002 flagged critical — water level at 22.1m", time: "2 min ago", type: "danger" },
                                    { text: `${adminCount} admin(s) and ${userCount} user(s) in the system`, time: "Current", type: "info" },
                                    { text: "Sensor DWLR-DL-001 reading updated — 14.2m", time: "3 hours ago", type: "success" },
                                    { text: "System backup completed successfully", time: "6 hours ago", type: "info" },
                                    { text: "Sensor DWLR-RJ-001 battery low warning", time: "12 hours ago", type: "warn" },
                                ].map((a, i) => (
                                    <div key={i} className={styles.activityItem}>
                                        <span className={`${styles.activityDot} ${styles[a.type]}`} />
                                        <div>
                                            <p className={styles.activityText}>{a.text}</p>
                                            <p className={styles.activityTime}>{a.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ── Users Tab ─── */}
                {tab === "users" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Joined</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id}>
                                            <td className={styles.cellBold}>{u.username}</td>
                                            <td className={styles.cellMono}>{u.email}</td>
                                            <td>
                                                <span className={`${styles.badge} ${u.role === "admin" ? styles.badgeAdmin : u.role === "viewer" ? styles.badgeInactive : styles.badgeUser}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className={styles.cellMuted}>{u.created}</td>
                                            <td>
                                                <div className={styles.actionGroup}>
                                                    <button className={styles.actionBtn} onClick={() => openEditUser(u)} title="Edit user">Edit</button>
                                                    <button
                                                        className={`${styles.actionBtn} ${u.role === "admin" ? styles.demoteBtn : styles.promoteBtn}`}
                                                        onClick={() => toggleRole(u)}
                                                        title={u.role === "admin" ? "Demote to user" : "Promote to admin"}
                                                    >
                                                        {u.role === "admin" ? "Demote" : "Promote"}
                                                    </button>
                                                    <button
                                                        className={styles.deleteBtn}
                                                        onClick={() => deleteUser(u.id, u.username)}
                                                        title="Delete user"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {/* ── Sensors Tab ─── */}
                {tab === "sensors" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Sensor ID</th>
                                        <th>Name</th>
                                        <th>Location</th>
                                        <th>Status</th>
                                        <th>Last Reading</th>
                                        <th>Updated</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sensors.map(s => (
                                        <tr key={s.id}>
                                            <td className={styles.cellMono}>{s.id}</td>
                                            <td className={styles.cellBold}>{s.name}</td>
                                            <td className={styles.cellMuted}>{s.district}, {s.state}</td>
                                            <td>
                                                <span className={`${styles.badge} ${s.status === "active" ? styles.badgeActive : s.status === "critical" ? styles.badgeCritical : styles.badgeInactive}`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className={styles.cellMono}>{s.lastReading}</td>
                                            <td className={styles.cellMuted}>{s.lastUpdated}</td>
                                            <td>
                                                <div className={styles.actionGroup}>
                                                    <button className={styles.actionBtn} onClick={() => openEditSensor(s)}>Edit</button>
                                                    <button className={`${styles.actionBtn} ${styles.promoteBtn}`} onClick={() => openPushReading(s)}>Push</button>
                                                    <button className={styles.deleteBtn} onClick={() => deleteSensor(s.id)}>Delete</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {/* ── Readings Tab ─── */}
                {tab === "readings" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <p className={styles.pageSubtitle} style={{ marginBottom: 20 }}>Select a sensor to push a manual reading</p>
                        <div className={styles.sensorCards}>
                            {sensors.map(s => (
                                <div key={s.id} className={styles.sensorCard} onClick={() => openPushReading(s)}>
                                    <div className={styles.sensorCardHeader}>
                                        <span className={styles.cellMono}>{s.id}</span>
                                        <span className={`${styles.badge} ${s.status === "active" ? styles.badgeActive : styles.badgeCritical}`}>{s.status}</span>
                                    </div>
                                    <p className={styles.cellBold}>{s.name}</p>
                                    <p className={styles.cellMuted}>{s.district}, {s.state}</p>
                                    <div className={styles.sensorCardMetric}>
                                        <span style={{ color: "#4db8db", fontFamily: "'JetBrains Mono', monospace", fontSize: "1.3rem", fontWeight: 700 }}>{s.lastReading}</span>
                                        <span className={styles.cellMuted}>{s.lastUpdated}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </main>

            {/* ── Modal ─── */}
            <AnimatePresence>
                {modal && (
                    <motion.div
                        className={styles.modalOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setModal(null)}
                    >
                        <motion.div
                            className={styles.modalCard}
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ duration: 0.25 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h2 className={styles.modalTitle}>
                                {modal === "addUser" ? "Add New User" : modal === "editUser" ? "Edit User" : modal === "addSensor" ? "Add New Sensor" : modal === "editSensor" ? "Edit Sensor" : `Push Reading — ${editItem?.id}`}
                            </h2>

                            <div className={styles.modalForm}>
                                {/* User forms */}
                                {(modal === "addUser" || modal === "editUser") && (
                                    <>
                                        <div className={styles.modalField}>
                                            <label>Username *</label>
                                            <input value={formData.username || ""} onChange={e => setFormData({ ...formData, username: e.target.value })} placeholder="johndoe" />
                                        </div>
                                        <div className={styles.modalField}>
                                            <label>Email *</label>
                                            <input type="email" value={formData.email || ""} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="user@aquaviz.com" />
                                        </div>
                                        <div className={styles.modalRow}>
                                            <div className={styles.modalField}>
                                                <label>{modal === "editUser" ? "New Password (optional)" : "Password *"}</label>
                                                <input type="password" value={formData.password || ""} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="••••••" />
                                            </div>
                                            <div className={styles.modalField}>
                                                <label>Role</label>
                                                <select value={formData.role || "user"} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                                    <option value="admin">Admin</option>
                                                    <option value="user">User</option>
                                                    <option value="viewer">Viewer</option>
                                                </select>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Sensor forms */}
                                {(modal === "addSensor" || modal === "editSensor") && (
                                    <>
                                        <div className={styles.modalRow}>
                                            <div className={styles.modalField}>
                                                <label>Sensor ID *</label>
                                                <input value={formData.id || ""} onChange={e => setFormData({ ...formData, id: e.target.value })} placeholder="DWLR-XX-001" disabled={modal === "editSensor"} />
                                            </div>
                                            <div className={styles.modalField}>
                                                <label>Status</label>
                                                <select value={formData.status || "active"} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                    <option value="critical">Critical</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className={styles.modalField}>
                                            <label>Station Name *</label>
                                            <input value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Delhi Station" />
                                        </div>
                                        <div className={styles.modalRow}>
                                            <div className={styles.modalField}>
                                                <label>District</label>
                                                <input value={formData.district || ""} onChange={e => setFormData({ ...formData, district: e.target.value })} placeholder="Central Delhi" />
                                            </div>
                                            <div className={styles.modalField}>
                                                <label>State *</label>
                                                <input value={formData.state || ""} onChange={e => setFormData({ ...formData, state: e.target.value })} placeholder="Delhi" />
                                            </div>
                                        </div>
                                        <div className={styles.modalRow}>
                                            <div className={styles.modalField}>
                                                <label>Latitude</label>
                                                <input type="number" step="0.001" value={formData.lat || ""} onChange={e => setFormData({ ...formData, lat: e.target.value })} placeholder="28.6139" />
                                            </div>
                                            <div className={styles.modalField}>
                                                <label>Longitude</label>
                                                <input type="number" step="0.001" value={formData.lng || ""} onChange={e => setFormData({ ...formData, lng: e.target.value })} placeholder="77.209" />
                                            </div>
                                            <div className={styles.modalField}>
                                                <label>Depth (m)</label>
                                                <input type="number" value={formData.depth || ""} onChange={e => setFormData({ ...formData, depth: e.target.value })} placeholder="45" />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Push Reading form */}
                                {modal === "pushReading" && (
                                    <>
                                        <div className={styles.modalRow}>
                                            <div className={styles.modalField}>
                                                <label>Water Level (m) *</label>
                                                <input type="number" step="0.1" value={formData.water_level || ""} onChange={e => setFormData({ ...formData, water_level: e.target.value })} placeholder="14.2" />
                                            </div>
                                            <div className={styles.modalField}>
                                                <label>pH</label>
                                                <input type="number" step="0.1" value={formData.ph || ""} onChange={e => setFormData({ ...formData, ph: e.target.value })} placeholder="7.0" />
                                            </div>
                                        </div>
                                        <div className={styles.modalRow}>
                                            <div className={styles.modalField}>
                                                <label>TDS (mg/L)</label>
                                                <input type="number" value={formData.tds || ""} onChange={e => setFormData({ ...formData, tds: e.target.value })} placeholder="320" />
                                            </div>
                                            <div className={styles.modalField}>
                                                <label>Temperature (°C)</label>
                                                <input type="number" step="0.1" value={formData.temperature || ""} onChange={e => setFormData({ ...formData, temperature: e.target.value })} placeholder="25" />
                                            </div>
                                        </div>
                                        <div className={styles.modalField}>
                                            <label>Quality Status</label>
                                            <select value={formData.quality_status || "Good"} onChange={e => setFormData({ ...formData, quality_status: e.target.value })}>
                                                <option value="Good">Good</option>
                                                <option value="Moderate">Moderate</option>
                                                <option value="Critical">Critical</option>
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className={styles.modalActions}>
                                <button className={styles.modalCancel} onClick={() => setModal(null)}>Cancel</button>
                                <button
                                    className={styles.modalSave}
                                    onClick={() => {
                                        if (modal === "addUser" || modal === "editUser") saveUser();
                                        else if (modal === "addSensor" || modal === "editSensor") saveSensor();
                                        else pushReading();
                                    }}
                                >
                                    {modal.includes("add") ? "Create" : modal === "pushReading" ? "Push Reading" : "Save Changes"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Toast ─── */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        className={`${styles.toast} ${styles[toast.type]}`}
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                    >
                        {toast.msg}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
