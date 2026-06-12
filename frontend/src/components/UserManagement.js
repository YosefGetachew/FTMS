import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import "./UserManagement.css";

function UserManagement() {
  const workflowTypes = useMemo(
    () => [
      { value: "sector_structure", label: "Sector" },
      { value: "ceo_structure", label: "CEO" },
      {
        value: "office_head_structure",
        label: "Head of the Minister's Office",
      },
    ],
    []
  );

  const systemRoles = useMemo(
    () => [
      { value: "super_admin", label: "Super Admin" },
      { value: "admin", label: "Admin" },
      { value: "protocol", label: "Protocol" },
      { value: "pm_office", label: "PM Office" },
      { value: "minister", label: "Minister" },
    ],
    []
  );

  const hierarchyRoles = useMemo(
    () => [
      { value: "state_minister", label: "State Minister" },
      { value: "lead_executive_officer", label: "Lead Executive Officer" },
      { value: "chief_executive_officer", label: "CEO" },
      {
        value: "office_head",
        label: "Head of the Minister's Office",
      },
    ],
    []
  );

  const officerRoles = useMemo(
    () => [...systemRoles, ...hierarchyRoles],
    [systemRoles, hierarchyRoles]
  );

  const systemRoleValues = useMemo(
    () => ["super_admin", "admin", "protocol", "pm_office", "minister"],
    []
  );

  const hierarchyRoleValues = useMemo(
    () => [
      "state_minister",
      "lead_executive_officer",
      "lead_executive",
      "chief_executive_officer",
      "ceo",
      "office_head",
    ],
    []
  );

  const initialFormData = {
    fullName: "",
    email: "",
    password: "",
    accountGroup: "hierarchy",
    structureType: "sector_structure",
    sector: "",
    department: "",
    role: "state_minister",
  };

  const [users, setUsers] = useState([]);
  const [moaSectors, setMoaSectors] = useState([]);
  const [executiveOffices, setExecutiveOffices] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [editingId, setEditingId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [structureFilter, setStructureFilter] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [notice, setNotice] = useState(null);

  const officerRoleValues = officerRoles.map((role) => role.value);

  useEffect(() => {
    fetchUsers();
    fetchMoaSectors();
    fetchExecutiveOffices();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await API.get("/users");
      setUsers(response.data || []);
    } catch (error) {
      console.error(error);
      setNotice({ type: "error", message: "Failed to load users" });
    }
  };

  const fetchMoaSectors = async () => {
    try {
      const response = await API.get("/moa-sectors");
      setMoaSectors(response.data || []);
    } catch (error) {
      console.error(error);
      setNotice({ type: "error", message: "Failed to load structures" });
    }
  };

  const fetchExecutiveOffices = async () => {
    try {
      const response = await API.get("/moa-executive-offices");
      setExecutiveOffices(response.data || []);
    } catch (error) {
      console.error(error);
      setNotice({
        type: "error",
        message: "Failed to load Lead Executive Offices",
      });
    }
  };

  const getStructuresForWorkflowType = (workflowType) =>
    moaSectors.filter((item) => item.workflow_type === workflowType);

  const getLeadExecutiveOfficesForStructure = (structureName) =>
    executiveOffices.filter((office) => office.sector_name === structureName);

  const isLeadExecutiveRole = (role) =>
    ["lead_executive_officer", "lead_executive"].includes(role);

  const getRolesForStructureType = (workflowType) => {
    const roleMap = {
      sector_structure: ["state_minister", "lead_executive_officer"],
      ceo_structure: ["chief_executive_officer", "lead_executive_officer"],
      office_head_structure: ["office_head", "lead_executive_officer"],
    };

    return hierarchyRoles.filter((role) =>
      (roleMap[workflowType] || []).includes(role.value)
    );
  };

  const getDefaultRoleForStructureType = (workflowType) => {
    if (workflowType === "sector_structure") return "state_minister";
    if (workflowType === "ceo_structure") return "chief_executive_officer";
    if (workflowType === "office_head_structure") return "office_head";
    return "lead_executive_officer";
  };

  const formatRole = (role) => {
    const foundRole = officerRoles.find((item) => item.value === role);
    if (foundRole) return foundRole.label;

    const fallbackRoles = {
      traveler: "Traveler",
      expert: "Expert",
      lead_executive: "Lead Executive Officer",
      ceo: "CEO",
      super_admin: "Super Admin",
      pm_office: "PM Office",
    };

    return fallbackRoles[role] || role || "-";
  };

  const formatWorkflowType = (workflowType) => {
    const found = workflowTypes.find((item) => item.value === workflowType);
    return found?.label || workflowType || "-";
  };

  const getStructureTypeForUser = (user) => {
    const structure = moaSectors.find((item) => item.name === user.sector);
    return structure?.workflow_type || "";
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingId(null);
    setShowEditModal(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "accountGroup") {
      setFormData({
        ...formData,
        accountGroup: value,
        role: value === "system" ? "admin" : getDefaultRoleForStructureType(formData.structureType),
        sector: "",
        department: "",
      });
      return;
    }

    if (name === "structureType") {
      setFormData({
        ...formData,
        structureType: value,
        role: getDefaultRoleForStructureType(value),
        sector: "",
        department: "",
      });
      return;
    }

    if (name === "sector" || name === "role") {
      setFormData({
        ...formData,
        [name]: value,
        department: "",
      });
      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const validateForm = () => {
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.role) {
      alert("Please complete required fields");
      return false;
    }

    if (!editingId && !formData.password.trim()) {
      alert("Password is required for new officer");
      return false;
    }

    if (!officerRoleValues.includes(formData.role)) {
      alert("Only officer roles can be created here");
      return false;
    }

    if (formData.accountGroup === "hierarchy" && !formData.sector.trim()) {
      alert("Please select the parent structure");
      return false;
    }

    if (
      formData.accountGroup === "hierarchy" &&
      isLeadExecutiveRole(formData.role) &&
      !formData.department.trim()
    ) {
      alert("Please select the Lead Executive Office");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const isHierarchy = formData.accountGroup === "hierarchy";

    try {
      setLoading(true);

      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        role: formData.role,
        sector: isHierarchy ? formData.sector : "",
        department:
          isHierarchy && isLeadExecutiveRole(formData.role)
            ? formData.department
            : "",
      };

      if (editingId) {
        await API.put(`/users/${editingId}`, payload);
        setNotice({ type: "success", message: "Officer updated successfully" });
      } else {
        await API.post("/users", {
          ...payload,
          password: formData.password,
        });
        setNotice({ type: "success", message: "Officer added successfully" });
      }

      resetForm();
      fetchUsers();
    } catch (error) {
      console.error(error);
      setNotice({
        type: "error",
        message: error.response?.data?.error || "Failed to save user",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    const structureType = getStructureTypeForUser(user) || "sector_structure";
    const isHierarchy = hierarchyRoles.some((role) => role.value === user.role);

    setEditingId(user.id);
    setFormData({
      fullName: user.full_name || "",
      email: user.email || "",
      password: "",
      accountGroup: isHierarchy ? "hierarchy" : "system",
      structureType,
      sector: user.sector || "",
      department: user.department || "",
      role: user.role || "admin",
    });
    setShowEditModal(true);
  };

  const handleResetPassword = async (id) => {
    const newPassword = prompt("Enter new password");

    if (!newPassword) return;

    try {
      await API.put(`/users/${id}/reset-password`, { newPassword });
      setNotice({ type: "success", message: "Password reset successfully" });
    } catch (error) {
      console.error(error);
      setNotice({ type: "error", message: "Failed to reset password" });
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this user?"
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/users/${id}`);
      setNotice({ type: "success", message: "User deleted successfully" });
      fetchUsers();
    } catch (error) {
      console.error(error);
      setNotice({ type: "error", message: "Failed to delete user" });
    }
  };

  const travelers = users.filter((user) =>
    ["traveler", "expert"].includes(user.role)
  );

  const workflowApprovers = users.filter((user) =>
    hierarchyRoleValues.includes(user.role)
  );

  const filteredWorkflowApprovers = workflowApprovers.filter((user) => {
    if (!structureFilter) return true;
    return user.sector === structureFilter;
  });

  const systemOfficers = users.filter((user) =>
    systemRoleValues.includes(user.role)
  );

  const categorizedUserIds = new Set([
    ...travelers.map((user) => user.id),
    ...workflowApprovers.map((user) => user.id),
    ...systemOfficers.map((user) => user.id),
  ]);

  const otherAccounts = users.filter((user) => !categorizedUserIds.has(user.id));

  const accountStats = useMemo(
    () => [
      {
        label: "Total Accounts",
        value: users.length,
        helper: "All registered system users",
      },
      {
        label: "Workflow Approvers",
        value: workflowApprovers.length,
        helper: "Decision makers by structure",
      },
      {
        label: "System Officers",
        value: systemOfficers.length,
        helper: "Admin, protocol, PM Office, and minister access",
      },
      {
        label: "Travelers",
        value: travelers.length,
        helper: "Traveler and expert accounts",
      },
    ],
    [users.length, workflowApprovers.length, systemOfficers.length, travelers.length]
  );

  const filterBySearch = (items) => {
    const search = tableSearch.trim().toLowerCase();

    if (!search) return items;

    return items.filter((user) =>
      [
        user.full_name,
        user.email,
        user.role,
        user.sector,
        user.department,
        user.account_status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  };

  const renderHierarchyFields = () => (
    <>
      <div className="settings-group">
        <label>Structure Type *</label>
        <select
          name="structureType"
          value={formData.structureType}
          onChange={handleChange}
        >
          {workflowTypes.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="settings-group">
        <label>{formatWorkflowType(formData.structureType)} *</label>
        <select name="sector" value={formData.sector} onChange={handleChange}>
          <option value="">Select {formatWorkflowType(formData.structureType)}</option>
          {getStructuresForWorkflowType(formData.structureType).map((item) => (
            <option key={item.id} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="settings-group">
        <label>Role *</label>
        <select name="role" value={formData.role} onChange={handleChange}>
          {getRolesForStructureType(formData.structureType).map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      <div className="settings-group">
        <label>Lead Executive Office *</label>
        {isLeadExecutiveRole(formData.role) ? (
          <select
            name="department"
            value={formData.department}
            onChange={handleChange}
            disabled={!formData.sector}
          >
            <option value="">Select Lead Executive Office</option>
            {getLeadExecutiveOfficesForStructure(formData.sector).map((office) => (
              <option key={office.id} value={office.name}>
                {office.name}
              </option>
            ))}
          </select>
        ) : (
          <input value="Not required for this role" disabled readOnly />
        )}
      </div>
    </>
  );

  const renderUserTable = (items, emptyMessage) => (
    <div className="user-management-table-wrap">
      <table className="user-management-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Access Role</th>
            <th>Structure</th>
            <th>Lead Executive Office</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="6">{emptyMessage}</td>
            </tr>
          ) : (
            items.map((user) => (
              <tr key={user.id}>
                <td className="user-management-person">
                  <strong>{user.full_name || "-"}</strong>
                  <span>{user.email || "-"}</span>
                </td>
                <td>
                  <span className="user-role-pill">{formatRole(user.role)}</span>
                </td>
                <td className="user-management-muted">
                  {user.sector || user.organization_name || user.organization_type || "-"}
                </td>
                <td className="user-management-muted">{user.department || "-"}</td>
                <td>{user.account_status || "-"}</td>
                <td>
                  <div className="user-management-actions">
                    {officerRoleValues.includes(user.role) && (
                      <button
                        className="user-action-btn edit"
                        type="button"
                        onClick={() => handleEdit(user)}
                      >
                        Edit
                      </button>
                    )}

                    <button
                      className="user-action-btn password"
                      type="button"
                      onClick={() => handleResetPassword(user.id)}
                    >
                      Reset Password
                    </button>

                    <button
                      className="user-action-btn delete"
                      type="button"
                      onClick={() => handleDelete(user.id)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderUserSection = (title, items, emptyMessage, children = null) => (
    <div
      className={`user-management-section${title === "Workflow Approvers" ? " user-workflow-approvers" : ""}`}
    >
      <div className="user-management-section-header">
        <div>
          <h3>{title}</h3>
          <p>{items.length} account{items.length === 1 ? "" : "s"} in this group</p>
        </div>
        {children}
      </div>
      {renderUserTable(filterBySearch(items), emptyMessage)}
    </div>
  );

  return (
    <div className="page-container user-management-page">
      <div className="user-management-header">
        <div>
          <span className="user-management-kicker">Administration</span>
          <h2>User Management</h2>
          <p>
            Create officer accounts, manage workflow approvers, and maintain
            traveler access across the FTMS structure.
          </p>
        </div>
      </div>

      <div className="user-management-summary-grid">
        {accountStats.map((item) => (
          <div className="user-management-summary-card" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.helper}</small>
          </div>
        ))}
      </div>

      {notice && (
        <div className={`user-management-notice ${notice.type}`}>
          {notice.message}
        </div>
      )}

      {!showEditModal && (
      <div className="user-management-form-card">
        <div className="user-management-card-header">
          <div>
            <h3>Add Officer</h3>
            <p>Register system officers and structure-level approvers.</p>
          </div>
        </div>

        <div className="workflow-approver-grid user-management-grid">
          <div className="settings-group">
            <label>Full Name *</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
            />
          </div>

          <div className="settings-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="settings-group">
            <label>Temporary Password *</label>
            {!editingId ? (
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
              />
            ) : (
              <input value="Use Reset Password to change" disabled readOnly />
            )}
          </div>

          <div className="settings-group">
            <label>User Group *</label>
            <select
              name="accountGroup"
              value={formData.accountGroup}
              onChange={handleChange}
            >
              <option value="hierarchy">Structure Approver</option>
              <option value="system">System Officer</option>
            </select>
          </div>

          {formData.accountGroup === "hierarchy" ? (
            renderHierarchyFields()
          ) : (
            <div className="settings-group">
              <label>Role *</label>
              <select name="role" value={formData.role} onChange={handleChange}>
                {systemRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="workflow-approver-actions">
          <button
            className="save-settings-btn user-management-primary-btn"
            type="button"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Saving..." : "Add Officer"}
          </button>
        </div>
      </div>
      )}

      <div className="user-management-directory-toolbar">
        <label>
          Search Accounts
          <input
            type="search"
            placeholder="Search by name, email, role, structure..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
          />
        </label>
      </div>

      {renderUserSection(
        "Workflow Approvers",
        filteredWorkflowApprovers,
        "No workflow approvers found",
        <div className="user-management-filter-row">
          <label>
            Structure
            <select
              value={structureFilter}
              onChange={(e) => setStructureFilter(e.target.value)}
            >
              <option value="">All Structures</option>
              {moaSectors.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name} - {formatWorkflowType(item.workflow_type)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {renderUserSection(
        "System Officers",
        systemOfficers,
        "No system officers found"
      )}

      {renderUserSection("Travelers", travelers, "No travelers found")}

      {otherAccounts.length > 0 &&
        renderUserSection(
          "Other Accounts",
          otherAccounts,
          "No other accounts found"
        )}

      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content user-management-modal">
            <div className="user-management-modal-header">
              <div>
                <span>Edit Account</span>
                <h3>Edit Officer</h3>
                <p>Update the officer profile, role, and assigned structure.</p>
              </div>
              <button
                className="modal-close-btn"
                type="button"
                onClick={resetForm}
                aria-label="Close edit officer modal"
              >
                x
              </button>
            </div>

            <div className="workflow-approver-grid user-management-grid">
              <div className="settings-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>

              <div className="settings-group">
                <label>Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div className="settings-group">
                <label>Password</label>
                <input value="Use Reset Password to change" disabled readOnly />
              </div>

              <div className="settings-group">
                <label>User Group *</label>
                <select
                  name="accountGroup"
                  value={formData.accountGroup}
                  onChange={handleChange}
                >
                  <option value="hierarchy">Structure Approver</option>
                  <option value="system">System Officer</option>
                </select>
              </div>

              {formData.accountGroup === "hierarchy" ? (
                renderHierarchyFields()
              ) : (
                <div className="settings-group">
                  <label>Role *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    {systemRoles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                className="save-settings-btn user-management-primary-btn"
                type="button"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Saving..." : "Update Officer"}
              </button>

              <button className="user-action-btn delete" type="button" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
