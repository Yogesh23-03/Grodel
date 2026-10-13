import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useSelector } from 'react-redux'
import MarketNav from '../components/MarketNav.jsx'
import { serverUrl } from '../App'

/*
 * ADMIN DASHBOARD
 * Nine sections over one dark, glassy surface. The two genuinely dangerous
 * areas — role changes / bans (Users) and seat management (Admins, Settings) —
 * only render for the founding admin (isFirstAdmin); the server enforces the
 * same rule, so hiding them is ergonomics rather than security.
 *
 * Every list is fetched from /api/admin/* and degrades to an inline message on
 * failure instead of an empty table.
 */

const SECTIONS = [
  { key: 'overview', label: 'Overview', emoji: '📊' },
  { key: 'users', label: 'Users', emoji: '👥' },
  { key: 'orders', label: 'Orders', emoji: '🧾' },
  { key: 'donations', label: 'Donations', emoji: '🤝' },
  { key: 'shops', label: 'Shops', emoji: '🏪' },
  { key: 'vendors', label: 'Vendors', emoji: '🌾' },
  { key: 'admins', label: 'Admins', emoji: '🛡️', firstAdminOnly: true },
  { key: 'fraud', label: 'Fraud signals', emoji: '🚨' },
  { key: 'settings', label: 'Settings', emoji: '⚙️', firstAdminOnly: true }
]

const ALL_ROLES = ['user', 'owner', 'vendor', 'deliveryBoy', 'trustMember', 'supplier', 'helper', 'admin']

const ROLE_BADGE = {
  user: 'g-badge-info',
  owner: 'g-badge-warning',
  vendor: 'g-badge-success',
  admin: 'g-badge-brand',
  deliveryBoy: 'g-badge-muted',
  trustMember: 'g-badge-info',
  supplier: 'g-badge-muted',
  helper: 'g-badge-muted'
}

const ORDER_BADGE = {
  pending: 'g-badge-warning',
  preparing: 'g-badge-info',
  'out of delivery': 'g-badge-brand',
  delivered: 'g-badge-success',
  cancelled: 'g-badge-danger'
}

const DONATION_BADGE = {
  pending: 'g-badge-warning',
  accepted: 'g-badge-info',
  picked_up: 'g-badge-brand',
  delivered: 'g-badge-success',
  cancelled: 'g-badge-danger'
}

const SEVERITY_BADGE = { High: 'g-badge-danger', Medium: 'g-badge-warning', Low: 'g-badge-info' }

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`
const shortDate = (value) => (value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

const Badge = ({ tone = 'g-badge-muted', children }) => (
  <span className={`g-badge ${tone}`}>{children}</span>
)

const Stat = ({ emoji, value, label }) => (
  <div className='g-stat'>
    <span style={{ fontSize: '1.4rem' }}>{emoji}</span>
    <span className='g-stat-value'>{value}</span>
    <span className='g-stat-label'>{label}</span>
  </div>
)

const Shell = ({ title, subtitle, children, actions }) => (
  <section className='g-card-solid p-5'>
    <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
      <div>
        <h2 className='g-heading'>{title}</h2>
        {subtitle && <p className='g-muted mt-1'>{subtitle}</p>}
      </div>
      {actions}
    </div>
    {children}
  </section>
)

function AdminDashboard() {
  const userData = useSelector((state) => state.user.userData)
  const isFirstAdmin = Boolean(userData?.isFirstAdmin)

  const [section, setSection] = useState('overview')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')

  const [stats, setStats] = useState(null)
  const [activity, setActivity] = useState([])
  const [users, setUsers] = useState({ rows: [], total: 0, pages: 1 })
  const [orders, setOrders] = useState({ rows: [], total: 0, pages: 1 })
  const [donations, setDonations] = useState([])
  const [shops, setShops] = useState([])
  const [vendors, setVendors] = useState([])
  const [admins, setAdmins] = useState({ admins: [], current: 0, max: 5, full: false })
  const [signals, setSignals] = useState([])
  const [settings, setSettings] = useState({ platformName: '', maintenanceMode: false })
  const [maxAdmins, setMaxAdmins] = useState(5)

  const [roleFilter, setRoleFilter] = useState('all')
  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [orderStatus, setOrderStatus] = useState('all')
  const [orderPage, setOrderPage] = useState(1)

  /* The server side of this is a regex search; a debounce keeps a fast typist
     from firing a request per keystroke. */
  const debouncedSearch = useRef(null)
  const [searchTerm, setSearchTerm] = useState('')
  useEffect(() => {
    clearTimeout(debouncedSearch.current)
    debouncedSearch.current = setTimeout(() => {
      setUserSearch(searchTerm.trim())
      setUserPage(1)
    }, 400)
    return () => clearTimeout(debouncedSearch.current)
  }, [searchTerm])

  const get = useCallback(async (path) => {
    const res = await axios.get(`${serverUrl}${path}`, { withCredentials: true })
    return res.data
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (section === 'overview') {
        const [statsData, activityData] = await Promise.all([
          get('/api/admin/stats'),
          get('/api/admin/activity')
        ])
        setStats(statsData.stats)
        setActivity(activityData.days || [])
      } else if (section === 'users') {
        const params = new URLSearchParams({ role: roleFilter, page: String(userPage), limit: '20' })
        if (userSearch) params.set('search', userSearch)
        const data = await get(`/api/admin/users?${params.toString()}`)
        setUsers({ rows: data.users || [], total: data.total || 0, pages: data.pages || 1 })
      } else if (section === 'orders') {
        const params = new URLSearchParams({ status: orderStatus, page: String(orderPage), limit: '20' })
        const data = await get(`/api/admin/orders?${params.toString()}`)
        setOrders({ rows: data.orders || [], total: data.total || 0, pages: data.pages || 1 })
      } else if (section === 'donations') {
        setDonations((await get('/api/admin/donations')).donations || [])
      } else if (section === 'shops') {
        setShops((await get('/api/admin/shops')).shops || [])
      } else if (section === 'vendors') {
        setVendors((await get('/api/admin/vendors')).vendors || [])
      } else if (section === 'admins') {
        const data = await get('/api/admin/admins')
        setAdmins(data)
        setMaxAdmins(data.max)
      } else if (section === 'fraud') {
        setSignals((await get('/api/admin/fraud')).signals || [])
      } else if (section === 'settings') {
        const data = await get('/api/admin/settings')
        setSettings({
          platformName: data.settings?.platformName || 'GroDel',
          maintenanceMode: Boolean(data.settings?.maintenanceMode)
        })
        setMaxAdmins(data.maxAdmins || 5)
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load this section')
    } finally {
      setLoading(false)
    }
  }, [section, get, roleFilter, userPage, userSearch, orderStatus, orderPage])

  useEffect(() => { load() }, [load])

  const flash = (message) => {
    setNotice(message)
    setTimeout(() => setNotice(''), 3200)
  }

  const changeRole = async (userId, role) => {
    try {
      await axios.patch(`${serverUrl}/api/admin/users/${userId}/role`, { role }, { withCredentials: true })
      flash('Role updated')
      load()
    } catch (err) { setError(err?.response?.data?.message || 'Could not update role') }
  }

  const toggleBan = async (user) => {
    try {
      const action = user.isBanned ? 'unban' : 'ban'
      await axios.patch(`${serverUrl}/api/admin/users/${user._id}/${action}`, {}, { withCredentials: true })
      flash(user.isBanned ? 'User unbanned' : 'User banned')
      load()
    } catch (err) { setError(err?.response?.data?.message || 'Could not change ban state') }
  }

  const vendorAction = async (vendorId, action) => {
    try {
      await axios.patch(`${serverUrl}/api/admin/vendors/${vendorId}/${action}`, {}, { withCredentials: true })
      flash(action === 'verify' ? 'Vendor verified' : 'Vendor suspended')
      load()
    } catch (err) { setError(err?.response?.data?.message || 'Could not update vendor') }
  }

  const saveSlots = async () => {
    try {
      const res = await axios.patch(`${serverUrl}/api/admin/slots`, { maxAdmins: Number(maxAdmins) }, { withCredentials: true })
      flash(`Admin limit is now ${res.data.maxAdmins}`)
      load()
    } catch (err) { setError(err?.response?.data?.message || 'Could not update admin slots') }
  }

  const saveSetting = async (key, value) => {
    try {
      await axios.patch(`${serverUrl}/api/admin/settings`, { key, value }, { withCredentials: true })
      flash('Setting saved')
    } catch (err) { setError(err?.response?.data?.message || 'Could not save setting') }
  }

  const visibleSections = useMemo(
    () => SECTIONS.filter((item) => !item.firstAdminOnly || isFirstAdmin),
    [isFirstAdmin]
  )

  const activeSection = visibleSections.find((item) => item.key === section) || visibleSections[0]

  return (
    <div className='g-page min-h-screen lg:pl-[76px]'>
      <MarketNav />

      <main className='mx-auto w-full max-w-[1440px] px-4 pb-16 pt-6 sm:px-6'>
        <header className='flex flex-wrap items-end justify-between gap-4'>
          <div>
            <p className='g-eyebrow'>Admin</p>
            <h1 className='g-title mt-2'>
              Platform <span className='grad-text'>control</span>
            </h1>
            <p className='g-body mt-2 max-w-2xl'>
              {isFirstAdmin
                ? 'You are the founding admin: roles, bans and admin seats are yours to manage.'
                : 'Signed in as an admin. Role changes, bans and seat management belong to the founding admin.'}
            </p>
          </div>
          <button className='g-btn-ghost' onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </header>

        {error && (
          <div className='mt-5 flex items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300'>
            <span>⚠️ {error}</span>
            <button className='g-btn-ghost' style={{ padding: '0.3rem 0.8rem' }} onClick={() => setError('')}>Dismiss</button>
          </div>
        )}
        {notice && (
          <div className='mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300'>
            ✅ {notice}
          </div>
        )}

        <div className='mt-6 lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-6'>
          {/* ── section rail: horizontal strip on mobile, real sidebar on lg ── */}
          <nav className='-mx-1 flex gap-2 overflow-x-auto pb-3 lg:mx-0 lg:flex-col lg:overflow-visible lg:pb-0'>
            {visibleSections.map((item) => {
              const active = item.key === activeSection.key
              return (
                <button
                  key={item.key}
                  onClick={() => setSection(item.key)}
                  className='flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all lg:w-full'
                  style={active
                    ? { background: 'var(--brand-soft)', color: 'var(--brand)', border: '1px solid rgba(255,77,45,0.3)' }
                    : { background: 'var(--glass-bg)', color: 'var(--text-secondary)', border: '1px solid var(--glass-border)' }}
                >
                  <span>{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className='min-w-0 space-y-5'>
            {/* ══════════════════ OVERVIEW ══════════════════ */}
            {activeSection.key === 'overview' && (
              <>
                <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                  <Stat emoji='👥' value={stats?.totalUsers ?? '—'} label='Total users' />
                  <Stat emoji='🧾' value={stats?.totalOrders ?? '—'} label='Orders' />
                  <Stat emoji='💰' value={stats ? money(stats.totalRevenue) : '—'} label='Revenue' />
                  <Stat emoji='🏪' value={stats?.shops ?? '—'} label='Active shops' />
                  <Stat emoji='🌾' value={stats?.vendors ?? '—'} label='Vendors' />
                  <Stat emoji='🤝' value={stats?.totalDonations ?? '—'} label='Donations' />
                  <Stat emoji='👨‍👩‍👧' value={stats?.groupOrders ?? '—'} label='Group orders' />
                  <Stat emoji='📦' value={stats?.listings ?? '—'} label='Listings' />
                </div>

                <Shell title='Orders · last 30 days' subtitle={`${stats?.todayOrders ?? 0} order(s) today`}>
                  {activity.length === 0 ? (
                    <p className='g-muted'>No activity recorded yet.</p>
                  ) : (
                    <>
                      <div className='flex h-[130px] items-end gap-[2px]'>
                        {activity.map((day) => {
                          const peak = Math.max(...activity.map((d) => d.revenue), 1)
                          const height = Math.max(3, Math.round((day.revenue / peak) * 120))
                          return (
                            <div
                              key={day.date}
                              className='stagger-item flex-1 rounded-t'
                              title={`${day.date} · ${day.orders} orders · ${money(day.revenue)}`}
                              style={{
                                height,
                                minWidth: 4,
                                background: 'linear-gradient(to top, #ff4d2d, #ff8c42)',
                                borderRadius: '4px 4px 0 0'
                              }}
                            />
                          )
                        })}
                      </div>
                      <div className='mt-2 flex justify-between'>
                        <span className='g-muted'>{activity[0]?.date}</span>
                        <span className='g-muted'>{activity[activity.length - 1]?.date}</span>
                      </div>
                    </>
                  )}
                </Shell>

                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  <Shell title='Users by role'>
                    <div className='space-y-2'>
                      {Object.entries(stats?.usersByRole || {}).map(([role, count]) => (
                        <div key={role} className='flex items-center justify-between'>
                          <Badge tone={ROLE_BADGE[role] || 'g-badge-muted'}>{role}</Badge>
                          <span className='g-body font-semibold'>{count}</span>
                        </div>
                      ))}
                    </div>
                  </Shell>
                  <Shell title='Donations by status'>
                    <div className='space-y-2'>
                      {Object.entries(stats?.donationsByStatus || {}).map(([status, count]) => (
                        <div key={status} className='flex items-center justify-between'>
                          <Badge tone={DONATION_BADGE[status] || 'g-badge-muted'}>{status}</Badge>
                          <span className='g-body font-semibold'>{count}</span>
                        </div>
                      ))}
                      {Object.keys(stats?.donationsByStatus || {}).length === 0 && (
                        <p className='g-muted'>No donations yet.</p>
                      )}
                    </div>
                  </Shell>
                </div>
              </>
            )}

            {/* ══════════════════ USERS ══════════════════ */}
            {activeSection.key === 'users' && (
              <Shell
                title='Users'
                subtitle={`${users.total} account(s)`}
                actions={
                  <div className='flex flex-wrap items-center gap-2'>
                    <input
                      className='g-input'
                      style={{ width: 200 }}
                      placeholder='Search name or email'
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                    />
                    <select
                      className='g-select'
                      style={{ width: 150 }}
                      value={roleFilter}
                      onChange={(event) => { setRoleFilter(event.target.value); setUserPage(1) }}
                    >
                      <option value='all'>All roles</option>
                      {ALL_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </div>
                }
              >
                <div className='overflow-x-auto'>
                  <table className='g-table' style={{ minWidth: 720 }}>
                    <thead>
                      <tr>
                        <th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Status</th>
                        {isFirstAdmin && <th>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {users.rows.map((row) => (
                        <tr key={row._id} className='stagger-item'>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                            {row.fullName}
                            {row.isFirstAdmin && <span className='ml-2' title='Founding admin'>👑</span>}
                          </td>
                          <td>{row.email}</td>
                          <td><Badge tone={ROLE_BADGE[row.role] || 'g-badge-muted'}>{row.role}</Badge></td>
                          <td>{shortDate(row.createdAt)}</td>
                          <td>
                            {row.isBanned
                              ? <Badge tone='g-badge-danger'>Banned</Badge>
                              : <Badge tone='g-badge-success'>Active</Badge>}
                          </td>
                          {isFirstAdmin && (
                            <td>
                              {row.isFirstAdmin ? (
                                <span className='g-muted'>Protected</span>
                              ) : (
                                <div className='flex items-center gap-2'>
                                  <select
                                    className='g-select'
                                    style={{ width: 130, padding: '0.35rem 0.6rem' }}
                                    value={row.role}
                                    onChange={(event) => changeRole(row._id, event.target.value)}
                                  >
                                    {ALL_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                                  </select>
                                  <button
                                    className={row.isBanned ? 'g-btn-ghost' : 'g-btn-ghost'}
                                    style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}
                                    onClick={() => toggleBan(row)}
                                  >
                                    {row.isBanned ? 'Unban' : 'Ban'}
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                      {users.rows.length === 0 && (
                        <tr><td colSpan={isFirstAdmin ? 6 : 5} className='g-muted'>No users match this filter.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className='mt-4 flex items-center justify-between'>
                  <button className='g-btn-ghost' disabled={userPage <= 1} onClick={() => setUserPage((p) => Math.max(1, p - 1))}>← Prev</button>
                  <span className='g-muted'>Page {userPage} of {users.pages}</span>
                  <button className='g-btn-ghost' disabled={userPage >= users.pages} onClick={() => setUserPage((p) => p + 1)}>Next →</button>
                </div>
              </Shell>
            )}

            {/* ══════════════════ ORDERS ══════════════════ */}
            {activeSection.key === 'orders' && (
              <Shell
                title='Orders'
                subtitle={`${orders.total} order(s)`}
                actions={
                  <select className='g-select' style={{ width: 170 }} value={orderStatus}
                    onChange={(event) => { setOrderStatus(event.target.value); setOrderPage(1) }}>
                    <option value='all'>All statuses</option>
                    {['pending', 'preparing', 'out of delivery', 'delivered', 'cancelled'].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                }
              >
                <div className='overflow-x-auto'>
                  <table className='g-table' style={{ minWidth: 720 }}>
                    <thead>
                      <tr><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th><th>Items</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {orders.rows.map((order) => (
                        <tr key={order._id} className='stagger-item'>
                          <td style={{ color: 'var(--text-primary)' }}>#{String(order._id).slice(-6)}</td>
                          <td>{order.user?.fullName || '—'}<div className='g-muted'>{order.user?.email}</div></td>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{money(order.totalAmount)}</td>
                          <td><Badge tone={ORDER_BADGE[order.status] || 'g-badge-muted'}>{order.status}</Badge></td>
                          <td>{order.shopOrders?.length || 0}</td>
                          <td>{shortDate(order.createdAt)}</td>
                        </tr>
                      ))}
                      {orders.rows.length === 0 && <tr><td colSpan={6} className='g-muted'>No orders match this filter.</td></tr>}
                    </tbody>
                  </table>
                </div>

                <div className='mt-4 flex items-center justify-between'>
                  <button className='g-btn-ghost' disabled={orderPage <= 1} onClick={() => setOrderPage((p) => Math.max(1, p - 1))}>← Prev</button>
                  <span className='g-muted'>Page {orderPage} of {orders.pages}</span>
                  <button className='g-btn-ghost' disabled={orderPage >= orders.pages} onClick={() => setOrderPage((p) => p + 1)}>Next →</button>
                </div>
              </Shell>
            )}

            {/* ══════════════════ DONATIONS ══════════════════ */}
            {activeSection.key === 'donations' && (
              <Shell title='Donations' subtitle={`${donations.length} record(s)`}>
                <div className='overflow-x-auto'>
                  <table className='g-table' style={{ minWidth: 780 }}>
                    <thead>
                      <tr><th>Donor</th><th>Food items</th><th>Trust</th><th>Status</th><th>Date</th></tr>
                    </thead>
                    <tbody>
                      {donations.map((donation) => (
                        <tr key={donation._id} className='stagger-item'>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                            {donation.donorId?.fullName || '—'}
                            <div className='g-muted'>{donation.donorRole}</div>
                          </td>
                          <td>
                            {(donation.foodItems || []).map((item, index) => (
                              <div key={index}>{item.name} · {item.quantity} {item.unit}</div>
                            ))}
                            {(!donation.foodItems || donation.foodItems.length === 0) && <span className='g-muted'>—</span>}
                          </td>
                          <td>{donation.assignedTrustId?.name || <span className='g-muted'>Unassigned</span>}</td>
                          <td><Badge tone={DONATION_BADGE[donation.status] || 'g-badge-muted'}>{donation.status}</Badge></td>
                          <td>{shortDate(donation.createdAt)}</td>
                        </tr>
                      ))}
                      {donations.length === 0 && <tr><td colSpan={5} className='g-muted'>No donations yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
                <p className='g-muted mt-3'>
                  Trust and delivery assignment stays on the Trusts page — this view is read-only.
                </p>
              </Shell>
            )}

            {/* ══════════════════ SHOPS ══════════════════ */}
            {activeSection.key === 'shops' && (
              <Shell title='Shops' subtitle={`${shops.length} shop(s)`}>
                <div className='overflow-x-auto'>
                  <table className='g-table' style={{ minWidth: 700 }}>
                    <thead>
                      <tr><th>Shop</th><th>Owner</th><th>City</th><th>Items</th><th>Rating</th></tr>
                    </thead>
                    <tbody>
                      {shops.map((shop) => (
                        <tr key={shop._id} className='stagger-item'>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{shop.name}</td>
                          <td>{shop.owner?.fullName || '—'}<div className='g-muted'>{shop.owner?.email}</div></td>
                          <td>{shop.city || '—'}</td>
                          <td>{shop.itemCount ?? shop.items?.length ?? 0}</td>
                          <td>{shop.rating?.average ? `${shop.rating.average.toFixed(1)} ★` : <span className='g-muted'>New</span>}</td>
                        </tr>
                      ))}
                      {shops.length === 0 && <tr><td colSpan={5} className='g-muted'>No shops yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </Shell>
            )}

            {/* ══════════════════ VENDORS ══════════════════ */}
            {activeSection.key === 'vendors' && (
              <Shell title='Vendors' subtitle={`${vendors.length} vendor(s)`}>
                <div className='overflow-x-auto'>
                  <table className='g-table' style={{ minWidth: 820 }}>
                    <thead>
                      <tr><th>Name</th><th>Phone</th><th>Location</th><th>Listings</th><th>Verified</th><th>Rating</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {vendors.map((vendor) => (
                        <tr key={vendor._id} className='stagger-item'>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                            {vendor.displayName || vendor.userId?.fullName || '—'}
                          </td>
                          <td>{vendor.phoneNumber || '—'}</td>
                          <td>{[vendor.location?.village, vendor.location?.district].filter(Boolean).join(', ') || '—'}</td>
                          <td>{vendor.listingCount ?? 0}</td>
                          <td>
                            {vendor.isVerified
                              ? <Badge tone='g-badge-success'>Verified</Badge>
                              : <Badge tone='g-badge-warning'>{vendor.isActive ? 'Pending' : 'Suspended'}</Badge>}
                          </td>
                          <td>{vendor.rating?.average ? `${vendor.rating.average.toFixed(1)} ★` : <span className='g-muted'>—</span>}</td>
                          <td>
                            <div className='flex gap-2'>
                              <button className='g-btn-ghost' style={{ padding: '0.3rem 0.8rem', fontSize: '0.72rem' }}
                                disabled={vendor.isVerified} onClick={() => vendorAction(vendor._id, 'verify')}>Verify</button>
                              <button className='g-btn-ghost' style={{ padding: '0.3rem 0.8rem', fontSize: '0.72rem' }}
                                onClick={() => vendorAction(vendor._id, 'suspend')}>Suspend</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {vendors.length === 0 && <tr><td colSpan={7} className='g-muted'>No vendors yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </Shell>
            )}

            {/* ══════════════════ ADMINS ══════════════════ */}
            {activeSection.key === 'admins' && (
              <>
                <Shell
                  title='Admin seats'
                  subtitle={`${admins.current} of ${admins.max} seats filled`}
                  actions={admins.full
                    ? <Badge tone='g-badge-danger'>Admin seats full</Badge>
                    : <Badge tone='g-badge-success'>Slots available</Badge>}
                >
                  <div className='g-progress-track'>
                    <div
                      className='g-progress-fill'
                      style={{ width: `${Math.min(100, (admins.current / Math.max(1, admins.max)) * 100)}%` }}
                    />
                  </div>
                  <p className='g-body mt-3'>
                    When every seat is taken the Admin option disappears from signup and the landing page.
                    The founding admin can raise or lower the limit below.
                  </p>

                  <div className='mt-4 flex flex-wrap items-end gap-3'>
                    <div className='g-form-group'>
                      <label className='g-label' htmlFor='maxAdmins'>Max admins (1–5)</label>
                      <input
                        id='maxAdmins'
                        className='g-input'
                        type='number'
                        min={Math.max(1, admins.current)}
                        max={5}
                        value={maxAdmins}
                        onChange={(event) => setMaxAdmins(event.target.value)}
                      />
                    </div>
                    <button className='g-btn' onClick={saveSlots}>Update max admins</button>
                  </div>
                </Shell>

                <Shell title='Current admins'>
                  <div className='overflow-x-auto'>
                    <table className='g-table' style={{ minWidth: 620 }}>
                      <thead><tr><th>Name</th><th>Email</th><th>First admin</th><th>Joined</th></tr></thead>
                      <tbody>
                        {admins.admins.map((admin) => (
                          <tr key={admin._id} className='stagger-item'>
                            <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{admin.fullName}</td>
                            <td>{admin.email}</td>
                            <td>{admin.isFirstAdmin ? <Badge tone='g-badge-brand'>👑 Founder</Badge> : <span className='g-muted'>—</span>}</td>
                            <td>{shortDate(admin.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Shell>
              </>
            )}

            {/* ══════════════════ FRAUD ══════════════════ */}
            {activeSection.key === 'fraud' && (
              <Shell
                title='Fraud signals'
                subtitle={`${signals.length} signal(s) detected`}
                actions={<button className='g-btn-ghost' onClick={load}>↻ Re-scan</button>}
              >
                {signals.length === 0 ? (
                  <p className='g-body'>No fraud signals detected. Platform looks healthy! ✅</p>
                ) : (
                  <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                    {signals.map((signal, index) => {
                      const severity = signal.severity === 'high' ? 'High' : signal.severity === 'medium' ? 'Medium' : 'Low'
                      return (
                        <div key={index} className='g-card-solid stagger-item p-4' style={{ animationDelay: `${index * 60}ms` }}>
                          <div className='mb-2 flex items-center justify-between gap-2'>
                            <Badge tone={SEVERITY_BADGE[severity]}>{severity}</Badge>
                            <span className='g-muted'>{signal.type?.replace(/_/g, ' ')}</span>
                          </div>
                          <p className='g-body'>{signal.description}</p>
                          {signal.userId && <p className='g-muted mt-1'>User: {String(signal.userId)}</p>}
                          {signal.vendorId && <p className='g-muted mt-1'>Vendor: {String(signal.vendorId)}</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </Shell>
            )}

            {/* ══════════════════ SETTINGS ══════════════════ */}
            {activeSection.key === 'settings' && (
              <Shell title='Settings' subtitle='Operator-tunable configuration, stored in the database'>
                <div className='space-y-5'>
                  <div className='g-form-group'>
                    <label className='g-label' htmlFor='platformName'>Platform name</label>
                    <input
                      id='platformName'
                      className='g-input'
                      value={settings.platformName}
                      onChange={(event) => setSettings((prev) => ({ ...prev, platformName: event.target.value }))}
                    />
                    <button className='g-btn mt-2' onClick={() => saveSetting('platformName', settings.platformName)}>Save name</button>
                  </div>

                  <div className='g-divider' />

                  <div className='flex items-center justify-between gap-4'>
                    <div>
                      <p className='g-heading'>Maintenance mode</p>
                      <p className='g-muted mt-1'>Reserved for a future read-only banner. The flag is saved now.</p>
                    </div>
                    <button
                      className={settings.maintenanceMode ? 'g-btn' : 'g-btn-ghost'}
                      onClick={() => {
                        const next = !settings.maintenanceMode
                        setSettings((prev) => ({ ...prev, maintenanceMode: next }))
                        saveSetting('maintenanceMode', next)
                      }}
                    >
                      {settings.maintenanceMode ? 'On' : 'Off'}
                    </button>
                  </div>

                  <div className='g-divider' />

                  <div className='flex flex-wrap items-end gap-3'>
                    <div className='g-form-group'>
                      <label className='g-label' htmlFor='settingsMaxAdmins'>Max admins (1–5)</label>
                      <input
                        id='settingsMaxAdmins'
                        className='g-input'
                        type='number'
                        min={1}
                        max={5}
                        value={maxAdmins}
                        onChange={(event) => setMaxAdmins(event.target.value)}
                      />
                    </div>
                    <button className='g-btn' onClick={saveSlots}>Save admin limit</button>
                  </div>
                </div>
              </Shell>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
