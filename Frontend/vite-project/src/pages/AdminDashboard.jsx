import React, { useEffect, useState } from "react";
import axios from "axios";
import MarketNav from "../components/MarketNav.jsx";
import DonationManagement from "../components/DonationManagement.jsx";
import { serverUrl } from "../App";

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [trusts, setTrusts] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [usersRes, trustsRes] = await Promise.all([
          axios.get(`${serverUrl}/api/user/all`, { withCredentials: true }),
          axios.get(`${serverUrl}/api/trusts`, { withCredentials: true })
        ]);
        setUsers(usersRes.data || []);
        setTrusts(trustsRes.data || []);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load admin data");
      }
    };
    fetchAdminData();
  }, []);

  const totals = {
    users: users.length,
    customers: users.filter(user => user.role === "user").length,
    owners: users.filter(user => user.role === "owner").length,
    deliveryBoys: users.filter(user => user.role === "deliveryBoy").length,
    trustMembers: users.filter(user => user.role === "trustMember").length,
    trusts: trusts.length
  };

  return (
    <div className="w-full min-h-screen bg-[#fff9f6] lg:pl-[76px] px-4 pb-10 flex flex-col items-center gap-6">
      <MarketNav />
      <div className="w-full max-w-6xl">
        <h1 className="text-3xl font-bold text-[#ff4d2d]">Admin Page</h1>
        <p className="text-gray-500 mt-1">Manage every major feature in the website from one place.</p>
      </div>

      {error && <div className="w-full max-w-6xl rounded-lg bg-red-500/10 text-red-500 px-4 py-3 font-semibold">{error}</div>}

      <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-6 gap-3">
        {Object.entries(totals).map(([label, value]) => (
          <div className="bg-white rounded-xl shadow border border-orange-100 p-4" key={label}>
            <p className="text-xs uppercase text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
          </div>
        ))}
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl shadow border border-orange-100 p-5">
          <h2 className="text-xl font-bold text-[#ff4d2d] mb-4">Users</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Name</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Mobile</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr className="border-b" key={user._id}>
                    <td className="py-2 font-semibold">{user.fullName}</td>
                    <td className="py-2 capitalize">{user.role}</td>
                    <td className="py-2">{user.email}</td>
                    <td className="py-2">{user.mobile}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-orange-100 p-5">
          <h2 className="text-xl font-bold text-[#ff4d2d] mb-4">Trusts</h2>
          <div className="space-y-3">
            {trusts.map(trust => (
              <div className="border rounded-lg p-3" key={trust._id}>
                <p className="font-bold">{trust.name}</p>
                <p className="text-sm text-gray-500">{trust.address}</p>
                <p className="text-sm text-gray-500">{trust.contactNumber} | {trust.email}</p>
                {trust.googlePayNumber && <p className="text-xs text-gray-400">GPay: {trust.googlePayNumber}</p>}
              </div>
            ))}
            {trusts.length === 0 && <p className="text-gray-500">No trusts registered</p>}
          </div>
        </div>
      </div>

      <DonationManagement />
    </div>
  );
}

export default AdminDashboard;
