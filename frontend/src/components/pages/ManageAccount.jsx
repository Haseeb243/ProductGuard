import React, { useEffect, useState } from "react";
import axios from "axios";
import bgImg from "../../img/bg.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LinkButton } from "../LinkButton";
import { Modal } from "@mui/material";
import { useConfig } from "../../context/ConfigContext";

const columns = [
  { field: "name", headerName: "Name" },
  { field: "description", headerName: "Description" },
  { field: "username", headerName: "Username" },
  { field: "website", headerName: "Website" },
  { field: "location", headerName: "Location" },
  { field: "role", headerName: "Role" },
];

const ManageAccount = () => {
  const { apiBaseUrl } = useConfig();
  const location = useLocation();
  const [rows, setRows] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [editUser, setEditUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const role = queryParams.get("role");
    if (role) {
      setRoleFilter(role);
    }
  }, [location]);

  useEffect(() => {
    axios.get(`${apiBaseUrl}/profileAll`).then((res) => {
      const dataWithId = res.data.map((row, idx) => ({
        ...row,
        id: row.id || row._id || row.username || idx,
      }));
      setRows(dataWithId);
    });
  }, []);

  const filteredRows =
    roleFilter === "all"
      ? rows
      : rows.filter((row) => row.role && row.role.toLowerCase() === roleFilter);

  const handleEdit = (user) => {
    setEditUser(user);
    setIsModalOpen(true);
  };

  const handleRemove = (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      axios.delete(`${apiBaseUrl}/users/${userId}`).then(() => {
        setRows((prevRows) => prevRows.filter((row) => row.id !== userId));
      });
    }
  };

  const handleSave = () => {
    axios.put(`${apiBaseUrl}/users/${editUser.id}`, editUser).then(() => {
      setRows((prevRows) =>
        prevRows.map((row) => (row.id === editUser.id ? editUser : row))
      );
      setIsModalOpen(false);
    });
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center"
      style={{
        backgroundImage: `linear-gradient(rgba(10,10,20,0.85),rgba(10,10,20,0.95)), url(${bgImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="w-full max-w-6xl px-4">
        <div className="rounded-3xl p-1 mt-10 bg-gradient-to-tr from-sky-400 via-indigo-500 to-blue-400 shadow-2xl">
          <div className="rounded-3xl bg-gray-900/90 backdrop-blur-lg p-8 flex flex-col items-center shadow-xl">
            <h1 className="text-3xl font-bold text-white mb-6">
              Manage Accounts
            </h1>
            <div className="w-full overflow-x-auto rounded-xl shadow-lg mb-6">
              <table className="min-w-full bg-gray-800/80 text-white rounded-xl overflow-hidden">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.field}
                        className="px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-left font-bold text-white"
                      >
                        {col.headerName}
                      </th>
                    ))}
                    <th className="px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-left font-bold text-white">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length + 1}
                        className="text-center py-8 text-gray-400"
                      >
                        No accounts found.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-gray-700 hover:bg-blue-900/30 transition"
                      >
                        {columns.map((col) => (
                          <td key={col.field} className="px-4 py-2">
                            {row[col.field]}
                          </td>
                        ))}
                        <td className="px-4 py-2 flex gap-2 justify-center">
                          <button
                            onClick={() => handleEdit(row)}
                            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 shadow-md"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemove(row.id)}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-md"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
              <div className="p-6 bg-white rounded-lg shadow-lg">
                <h2 className="text-xl font-bold mb-4">Edit User</h2>
                <label className="block text-gray-700 font-bold mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={editUser?.name || ""}
                  onChange={(e) =>
                    setEditUser((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full mb-4 p-2 border rounded"
                  placeholder="Name"
                />
                <label className="block text-gray-700 font-bold mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={editUser?.description || ""}
                  onChange={(e) =>
                    setEditUser((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="w-full mb-4 p-2 border rounded"
                  placeholder="Description"
                />
                <label className="block text-gray-700 font-bold mb-2">
                  Website
                </label>
                <input
                  type="text"
                  value={editUser?.website || ""}
                  onChange={(e) =>
                    setEditUser((prev) => ({
                      ...prev,
                      website: e.target.value,
                    }))
                  }
                  className="w-full mb-4 p-2 border rounded"
                  placeholder="Website"
                />
                <label className="block text-gray-700 font-bold mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={editUser?.location || ""}
                  onChange={(e) =>
                    setEditUser((prev) => ({
                      ...prev,
                      location: e.target.value,
                    }))
                  }
                  className="w-full mb-4 p-2 border rounded"
                  placeholder="Location"
                />
                <label className="block text-gray-700 font-bold mb-2">
                  Role
                </label>
                <select
                  value={editUser?.role || ""}
                  onChange={(e) =>
                    setEditUser((prev) => ({ ...prev, role: e.target.value }))
                  }
                  className="w-full mb-4 p-2 border rounded"
                >
                  <option value="">Select Role</option>
                  <option value="manufacturer">Manufacturer</option>
                  <option value="supplier">Supplier</option>
                  <option value="retailer">Retailer</option>
                </select>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-md"
                >
                  Save
                </button>
              </div>
            </Modal>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageAccount;
