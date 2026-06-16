import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../services/api";
import "./RequestTable.css";

function RequestTable() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [requests, setRequests] = useState([]);
  const [activeSearch, setActiveSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showHistorical, setShowHistorical] = useState(false);
  const [viewingRequest, setViewingRequest] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [selectedActionIds, setSelectedActionIds] = useState([]);

  const API_ORIGIN =
    import.meta.env.VITE_API_ORIGIN ||
    (import.meta.env.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, "")
      : process.env.NODE_ENV === "development"
      ? "http://localhost:5000"
      : window.location.origin);

  const getPdfUrl = (id) => `${API_ORIGIN}/api/generate-pdf/${id}`;
  const getUploadUrl = (fileName) => `${API_ORIGIN}/uploads/${fileName}`;

  const getRoleAliases = (role) => {
    const aliases = {
      ceo: ["ceo", "chief_executive_officer"],
      chief_executive_officer: ["chief_executive_officer", "ceo"],
      lead_executive: ["lead_executive", "lead_executive_officer"],
      lead_executive_officer: ["lead_executive_officer", "lead_executive"],
      project_coordinator: ["project_coordinator", "traveler"],
      state_minister: ["state_minister"],
      director_general: ["director_general"],
      office_head: ["office_head"],
      pm_office: ["pm_office"],
    };

    return [...new Set(aliases[role] || [role])].filter(Boolean);
  };

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setNotice(null);

      const roleAliases = getRoleAliases(user.role);
      const responses = await Promise.allSettled(
        roleAliases.map((role) => {
          const params = new URLSearchParams({
            role,
            email: user.email || "",
            id: user.id ? String(user.id) : "",
          });

          return API.get(`/requests?${params.toString()}`);
        })
      );

      const successfulResponses = responses
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);

      if (!successfulResponses.length) {
        throw responses.find((result) => result.status === "rejected")?.reason;
      }

      const mergedRequests = new Map();
      successfulResponses
        .flatMap((response) => response.data || [])
        .forEach((request) => {
          mergedRequests.set(request.id, request);
        });

      setRequests([...mergedRequests.values()]);
    } catch (error) {
      console.error(error);
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load requests";
      setNotice({
        type: "error",
        message: `Failed to load requests. Check that the API server is running and reachable. ${message}`,
      });
    } finally {
      setLoading(false);
    }
  }, [user.role, user.email, user.id]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "2-digit",
    });
  };

  const getInputDate = (date) => {
    if (!date) return "";
    return String(date).slice(0, 10);
  };

  const getTripDays = (startDate, endDate) => {
    if (!startDate || !endDate) return "-";

    const days =
      Math.ceil(
        (new Date(endDate) - new Date(startDate)) /
          (1000 * 60 * 60 * 24)
      ) + 1;

    return days > 0 ? days : "-";
  };

  const normalizeText = (value) => String(value || "").toLowerCase();

  const formatWorkflowType = (workflowType) => {
    const workflows = {
      ceo_structure: "CEO",
      office_head_structure: "Head of the Minister's Office",
      sector_structure: "Sector",
    };

    return workflows[workflowType] || workflowType || "-";
  };

  const formatStage = (stage) => {
    const stages = {
      expert_preparation: "Expert Preparation",
      director_review: "Lead Executive Officer Review",
      ceo_review: "CEO Review",
      office_head_review: "Office Head Review",
      lead_executive_review: "Lead Executive Officer Review",
      project_coordinator_review: "Project Coordinator Review",
      state_minister_review: "State Minister Review",
      protocol_clearance: "Protocol Clearance",
      office_head_final: "Office Head Final Decision",
      minister_review: "Minister Approval",
      pm_office_submission: "Protocol Submission to PM Office",
      pm_office_followup: "PM Office Follow-up",
      foreign_affairs_followup: "PM Office Follow-up",
      completed: "Completed",

      state_minister: "State Minister",
      director_general: "Director General",
      protocol: "Protocol",
      office_head: "Office Head",
      minister: "Minister",
      protocol_final: "Pending PM Office Response",
      traveler: "Traveler Amendment",
      chief_executive_officer: "Chief Executive Officer",
    };

    return stages[stage] || stage || "-";
  };

  const getStageTone = (stage) => {
    if (["completed"].includes(stage)) return "#166534";
    if (["expert_preparation"].includes(stage)) return "#b45309";
    if (["minister_review", "office_head_final"].includes(stage)) return "#7c3aed";
    if (["protocol_clearance", "pm_office_submission", "pm_office_followup", "foreign_affairs_followup"].includes(stage)) return "#0369a1";
    return "#1d4ed8";
  };

  const getComment = (request) =>
    request.amendment_comment ||
    request.decision_comment ||
    request.foreign_affairs_comment ||
    "-";

  const getPrimaryActionLabel = (request) => {
    if (request.current_stage === "protocol_clearance") return "Clear";
    if (request.current_stage === "office_head_final") return "Approve and send to Protocol for PM Office";
    if (request.current_stage === "minister_review") return "Approve and send to Protocol";
    if (request.current_stage === "pm_office_submission") return "Submit to PM Office";
    return "Approve";
  };

  const isAdmin = ["admin", "super_admin"].includes(user?.role);
  const isTraveler = ["traveler", "expert"].includes(user?.role);
  const isCEO = ["chief_executive_officer", "ceo"].includes(user?.role);
  const isDirectorGeneral = user?.role === "director_general";
  const isOfficeHead = user?.role === "office_head";
  const isLeadExecutive = ["lead_executive_officer", "lead_executive"].includes(user?.role);
  const isProjectCoordinator = user?.role === "project_coordinator";
  const isStateMinister = user?.role === "state_minister";
  const isProtocol = user?.role === "protocol";
  const isPmOffice = user?.role === "pm_office";
  const isMinister = user?.role === "minister";
  const canSeeHistorical = !isPmOffice;

  const canTravelerEditBeforeAction = useCallback(
    (request) => {
      if (!request || !isTraveler) return false;

      const sameTraveler =
        normalizeText(request.email).trim() === normalizeText(user.email).trim();
      const isOpen =
        request.final_status === "pending" || request.final_status === "amended";
      const noApproverAction =
        request.has_workflow_action === false ||
        request.has_workflow_action === "false" ||
        request.has_workflow_action === 0 ||
        request.has_workflow_action === "0";

      return sameTraveler && isOpen && noApproverAction;
    },
    [isTraveler, user.email]
  );

  const canDelete = isAdmin;
  const canViewPdf = [
    "protocol",
    "pm_office",
    "admin",
    "super_admin",
    "director_general",
    "office_head",
    "minister",
    "state_minister",
    "chief_executive_officer",
    "ceo",
    "lead_executive_officer",
    "lead_executive",
    "project_coordinator",
  ].includes(user?.role);

  const canGenerateSupportLetter = useCallback(
    (request) => {
      if (!canViewPdf) return false;

      const stage = normalizeText(request.current_stage);
      const finalStatus = normalizeText(request.final_status);

      return (
        ["pm_office_submission", "pm_office_followup", "foreign_affairs_followup", "completed"].includes(stage) ||
        finalStatus === "approved"
      );
    },
    [canViewPdf]
  );

  const stageMatches = useCallback((request, stages) => {
    const currentStage = normalizeText(request.current_stage);
    const status = normalizeText(request.status);

    return stages.some((stage) => currentStage === stage || status === stage);
  }, []);

  const canDecideRequest = useCallback(
    (request) => {
      if (isAdmin) return true;

      const workflowType = request.workflow_type;

      if (isLeadExecutive && stageMatches(request, ["lead_executive_review", "lead_executive"])) return true;
      if (
        isProjectCoordinator &&
        request.traveler_category === "project" &&
        stageMatches(request, ["project_coordinator_review", "project_coordinator"])
      ) {
        return true;
      }
      if (
        isDirectorGeneral &&
        request.traveler_category === "affiliate_institution" &&
        stageMatches(request, ["office_head_review", "director_general"])
      ) {
        return true;
      }
      if (
        isStateMinister &&
        workflowType === "sector_structure" &&
        stageMatches(request, ["state_minister", "state_minister_review"])
      ) {
        return true;
      }
      if (
        isCEO &&
        workflowType === "ceo_structure" &&
        stageMatches(request, ["ceo_review", "chief_executive_officer", "ceo"])
      ) {
        return true;
      }
      if (isOfficeHead && stageMatches(request, ["office_head_review", "office_head", "office_head_final"])) return true;
      if (isProtocol && stageMatches(request, ["protocol_clearance", "protocol", "pm_office_submission"])) {
        return true;
      }
      if (isPmOffice && stageMatches(request, ["pm_office_followup", "foreign_affairs_followup"])) {
        return true;
      }
      if (isMinister && stageMatches(request, ["minister_review", "minister"])) return true;

      return false;
    },
    [
      isAdmin,
      isCEO,
      isDirectorGeneral,
      isLeadExecutive,
      isProjectCoordinator,
      isMinister,
      isOfficeHead,
      isPmOffice,
      isProtocol,
      isStateMinister,
      stageMatches,
    ]
  );

  const submittedRequests = useMemo(() => {
    return requests.filter((request) => {
      const finalStatus = normalizeText(request.final_status);
      const currentStage = normalizeText(request.current_stage);
      const isPending =
        !["approved", "rejected"].includes(finalStatus) &&
        currentStage !== "completed";

      const isAmendedForTraveler =
        isTraveler &&
        currentStage === "expert_preparation" &&
        finalStatus === "amended";

      if (isAmendedForTraveler) return true;
      if (!isPending) return false;
      if (isTraveler) return true;

      return canDecideRequest(request);
    });
  }, [requests, isTraveler, canDecideRequest]);

  const historicalRequests = useMemo(() => {
    return requests.filter((request) => {
      const isHistorical =
        request.final_status === "approved" ||
        request.final_status === "rejected" ||
        request.current_stage === "completed";

      if (!isHistorical) return false;

      const keyword = normalizeText(search);

      if (!keyword) return true;

      return (
        normalizeText(request.full_name).includes(keyword) ||
        normalizeText(request.workflow_type).includes(keyword) ||
        normalizeText(request.sector).includes(keyword) ||
        normalizeText(request.department).includes(keyword) ||
        normalizeText(request.organization_name).includes(keyword) ||
        normalizeText(request.country).includes(keyword) ||
        normalizeText(request.purpose).includes(keyword) ||
        normalizeText(request.status).includes(keyword) ||
        normalizeText(request.final_status).includes(keyword) ||
        normalizeText(request.current_stage).includes(keyword)
      );
    });
  }, [requests, search]);

  const filteredSubmittedRequests = useMemo(() => {
    const keyword = normalizeText(activeSearch);

    return submittedRequests.filter((request) => {
      const finalStatus = normalizeText(request.final_status);
      const currentStage = normalizeText(request.current_stage);

      if (activeFilter === "action" && !canDecideRequest(request)) return false;
      if (activeFilter === "amended" && finalStatus !== "amended") return false;
      if (activeFilter === "protocol" && !currentStage.includes("protocol")) return false;
      if (activeFilter === "pm_office" && !currentStage.includes("pm_office")) return false;

      if (!keyword) return true;

      return (
        normalizeText(request.full_name).includes(keyword) ||
        normalizeText(request.position).includes(keyword) ||
        normalizeText(request.sector).includes(keyword) ||
        normalizeText(request.department).includes(keyword) ||
        normalizeText(request.organization_name).includes(keyword) ||
        normalizeText(request.country).includes(keyword) ||
        normalizeText(request.purpose).includes(keyword) ||
        normalizeText(request.status).includes(keyword) ||
        normalizeText(request.final_status).includes(keyword) ||
        normalizeText(request.current_stage).includes(keyword)
      );
    });
  }, [activeFilter, activeSearch, submittedRequests, canDecideRequest]);

  const isBulkActionable = useCallback(
    (request) =>
      canDecideRequest(request) &&
      request.final_status === "pending" &&
      request.current_stage !== "completed",
    [canDecideRequest]
  );

  const visibleActionableIds = useMemo(
    () =>
      filteredSubmittedRequests
        .filter(isBulkActionable)
        .map((request) => request.id),
    [filteredSubmittedRequests, isBulkActionable]
  );

  const showBulkActions = visibleActionableIds.length > 0;

  const selectedVisibleActionIds = useMemo(
    () =>
      selectedActionIds.filter((id) => visibleActionableIds.includes(id)),
    [selectedActionIds, visibleActionableIds]
  );

  const selectedVisibleRequests = useMemo(
    () =>
      filteredSubmittedRequests.filter((request) =>
        selectedVisibleActionIds.includes(request.id)
      ),
    [filteredSubmittedRequests, selectedVisibleActionIds]
  );

  const allVisibleActionsSelected =
    visibleActionableIds.length > 0 &&
    selectedVisibleActionIds.length === visibleActionableIds.length;

  const toggleActionSelection = (requestId) => {
    setSelectedActionIds((prev) =>
      prev.includes(requestId)
        ? prev.filter((id) => id !== requestId)
        : [...prev, requestId]
    );
  };

  const toggleAllVisibleActions = () => {
    setSelectedActionIds((prev) => {
      if (allVisibleActionsSelected) {
        return prev.filter((id) => !visibleActionableIds.includes(id));
      }

      return [...new Set([...prev, ...visibleActionableIds])];
    });
  };

  const queueSummary = useMemo(() => {
    const needsAction = submittedRequests.filter((request) => canDecideRequest(request)).length;
    const amended = submittedRequests.filter(
      (request) => normalizeText(request.final_status) === "amended"
    ).length;
    const protocol = submittedRequests.filter((request) =>
      normalizeText(request.current_stage).includes("protocol")
    ).length;
    const pmOffice = submittedRequests.filter((request) =>
      normalizeText(request.current_stage).includes("pm_office") ||
      normalizeText(request.current_stage).includes("foreign_affairs")
    ).length;

    return [
      {
        label: "Active Queue",
        value: submittedRequests.length,
        helper: "Visible requests",
      },
      {
        label: "Needs Action",
        value: needsAction,
        helper: "Assigned to your role",
      },
      {
        label: "Returned",
        value: amended,
        helper: "Needs correction",
      },
      {
        label: isPmOffice ? "PM Office" : "Protocol",
        value: isPmOffice ? pmOffice : protocol,
        helper: isPmOffice ? "Submitted to PM Office" : "Clearance/submission",
      },
    ];
  }, [submittedRequests, canDecideRequest, isPmOffice]);

  const updateStatus = async (id, action, comment = "") => {
    if (updatingId) return;

    try {
      setUpdatingId(id);

      await API.put(`/requests/${id}/status`, {
        action,
        role: user.role,
        actorEmail: user.email,
        actorId: user.id || null,
        comment,
      });

      await fetchRequests();
      setNotice({
        type: "success",
        message: "Request updated successfully.",
      });
    } catch (error) {
      console.error(error);
      setNotice({
        type: "error",
        message:
          error.response?.data?.error || "Failed to update request status",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const rejectRequest = async (request) => {
    let comment = "";

    const returnsToExpert = [
      "ceo_review",
      "office_head_review",
      "lead_executive_review",
      "project_coordinator_review",
      "state_minister_review",
    ].includes(request.current_stage);

    if (returnsToExpert) {
      comment = prompt("Enter correction / rejection comment");

      if (!comment || !comment.trim()) return;
    } else {
      const confirmReject = window.confirm(
        "Are you sure you want to reject this request?"
      );

      if (!confirmReject) return;
    }

    await updateStatus(request.id, "reject", comment.trim());
  };

  const amendRequest = async (id) => {
    const comment = prompt("Enter amendment comment");

    if (!comment || !comment.trim()) return;

    await updateStatus(id, "amend", comment.trim());
  };

  const updatePmOfficeStatus = async (id, action) => {
    const comment = prompt(
      action === "pm_office_approved"
        ? "Enter PM Office approval note, if any"
        : "Enter PM Office rejection reason"
    );

    if (action === "pm_office_rejected" && (!comment || !comment.trim())) {
      return;
    }

    if (updatingId) return;

    try {
      setUpdatingId(id);

      await API.put(`/requests/${id}/status`, {
        action,
        role: user.role,
        actorEmail: user.email,
        actorId: user.id || null,
        comment: comment || "",
        foreignAffairsComment: comment || "",
      });

      await fetchRequests();
      setNotice({
        type: "success",
        message: "PM Office decision updated.",
      });
    } catch (error) {
      console.error(error);
      setNotice({
        type: "error",
        message:
          error.response?.data?.error ||
          "Failed to update PM Office decision",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const updateRequest = async () => {
    if (!editingRequest) return;

    try {
      const data = new FormData();

      data.append("travelerCategory", editingRequest.traveler_category || "");
      data.append("workflowType", editingRequest.workflow_type || "");
      data.append("organizationName", editingRequest.organization_name || "");
      data.append("fullName", editingRequest.full_name || "");
      data.append("position", editingRequest.position || "");
      data.append("department", editingRequest.department || "");
      data.append("sector", editingRequest.sector || "");
      data.append("email", editingRequest.email || "");
      data.append("phone", editingRequest.phone || "");
      data.append("country", editingRequest.country || "");
      data.append("startDate", getInputDate(editingRequest.start_date));
      data.append("endDate", getInputDate(editingRequest.end_date));
      data.append("purpose", editingRequest.purpose || "");
      data.append("sponsor", editingRequest.sponsor || "");
      data.append("passportNumber", editingRequest.passport_number || "");

      if (editingRequest.passportFile) {
        data.append("passportFile", editingRequest.passportFile);
      }

      if (editingRequest.invitationLetter) {
        data.append("invitationLetter", editingRequest.invitationLetter);
      }

      if (editingRequest.torFile) {
        data.append("torFile", editingRequest.torFile);
      }

      await API.put(`/requests/${editingRequest.id}`, data);

      setNotice({
        type: "success",
        message: "Request updated successfully.",
      });
      setEditingRequest(null);
      await fetchRequests();
    } catch (error) {
      console.error(error);
      setNotice({
        type: "error",
        message: error.response?.data?.error || "Failed to update request",
      });
    }
  };

  const getBulkPositiveAction = (request) => {
    if (request.current_stage === "protocol_clearance") return "clear";
    if (request.current_stage === "pm_office_submission") {
      return "submit_to_pm_office";
    }
    if (
      request.current_stage === "pm_office_followup" ||
      request.current_stage === "foreign_affairs_followup"
    ) {
      return "pm_office_approved";
    }

    return "approve";
  };

  const getBulkNegativeAction = (request) => {
    if (request.current_stage === "protocol_clearance") return "amend";
    if (
      request.current_stage === "pm_office_followup" ||
      request.current_stage === "foreign_affairs_followup"
    ) {
      return "pm_office_rejected";
    }

    return "reject";
  };

  const runBulkWorkflowAction = async (mode) => {
    if (updatingId || selectedVisibleRequests.length === 0) return;

    const isReject = mode === "reject";
    let comment = "";

    if (isReject) {
      comment = prompt(
        "Enter one comment/reason to apply to all selected requests"
      );

      if (!comment || !comment.trim()) return;
    } else {
      const confirmApprove = window.confirm(
        `Accept ${selectedVisibleRequests.length} selected request${
          selectedVisibleRequests.length === 1 ? "" : "s"
        }?`
      );

      if (!confirmApprove) return;
    }

    try {
      setUpdatingId(`bulk-${mode}`);

      const results = await Promise.allSettled(
        selectedVisibleRequests.map((request) => {
          const action = isReject
            ? getBulkNegativeAction(request)
            : getBulkPositiveAction(request);

          return API.put(`/requests/${request.id}/status`, {
            action,
            role: user.role,
            actorEmail: user.email,
            actorId: user.id || null,
            comment: comment.trim(),
            foreignAffairsComment: comment.trim(),
          });
        })
      );

      const succeeded = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failed = results.length - succeeded;

      setSelectedActionIds([]);
      await fetchRequests();
      setNotice({
        type: failed ? "error" : "success",
        message: failed
          ? `${succeeded} request${succeeded === 1 ? "" : "s"} updated; ${failed} failed.`
          : `${succeeded} request${succeeded === 1 ? "" : "s"} updated successfully.`,
      });
    } catch (error) {
      console.error(error);
      setNotice({
        type: "error",
        message:
          error.response?.data?.error ||
          "Failed to update selected requests",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const resubmitRequest = async (id) => {
    if (updatingId) return;

    try {
      setUpdatingId(id);

      await API.put(`/requests/${id}/resubmit`, {
        role: user.role,
        actorEmail: user.email,
        actorId: user.id || null,
      });

      await fetchRequests();
      setNotice({
        type: "success",
        message: "Request resubmitted successfully.",
      });
    } catch (error) {
      console.error(error);
      setNotice({
        type: "error",
        message: error.response?.data?.error || "Failed to resubmit request",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteRequest = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this request?"
    );

    if (!confirmDelete) return;

    try {
      setUpdatingId(id);

      await API.delete(`/requests/${id}`);

      await fetchRequests();
      setNotice({
        type: "success",
        message: "Request deleted successfully.",
      });
    } catch (error) {
      console.error(error);
      setNotice({
        type: "error",
        message: error.response?.data?.error || "Failed to delete request",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const openPdf = (id) => {
    window.open(getPdfUrl(id), "_blank");
  };

  const renderSectorDepartment = (request) => (
    <td className="request-structure-cell">
      <strong>
        {request.traveler_category === "affiliate_institution"
          ? "Affiliate Institute"
          : request.sector || "-"}
      </strong>
      <br />
      <small>
        {request.traveler_category === "affiliate_institution"
          ? request.organization_name || "-"
          : request.department || "-"}
      </small>
    </td>
  );

  const renderTripDate = (request) => (
    <td className="request-date-cell">
      <div>{formatDate(request.start_date)}</div>
      <span>to</span>
      <div>{formatDate(request.end_date)}</div>
      <strong>
        {getTripDays(request.start_date, request.end_date)} Days
      </strong>
    </td>
  );

  const renderStatus = (request) => (
    <span
      className={`status-badge ${normalizeText(request.status).replace(
        / /g,
        "-"
      )}`}
    >
      {request.status || "-"}
    </span>
  );

  const renderStage = (request) => (
    <span
      className="request-stage-text"
      style={{
        "--stage-color": getStageTone(request.current_stage),
      }}
    >
      {formatStage(request.current_stage)}
    </span>
  );

  const renderWrappedText = (value, maxWidth = "220px") => (
    <td
      className="request-wrap-cell"
      style={{
        maxWidth,
      }}
    >
      {value || "-"}
    </td>
  );

  const renderTravelerCell = (request) => (
    <td className="request-traveler-cell">
      <strong>{request.full_name || "-"}</strong>
      <small>{request.position || "-"}</small>
    </td>
  );

  const renderCommentCell = (request) => (
    <td
      className={`request-comment-cell ${
        request.final_status === "amended" ? "amended" : ""
      }`}
    >
      {getComment(request)}
    </td>
  );

  const renderFinalStatus = (request) => {
    if (request.final_status === "approved") {
      return <span className="status-badge approved">Approved</span>;
    }

    if (request.final_status === "rejected") {
      return <span className="status-badge rejected">Rejected</span>;
    }

    if (request.final_status === "amended") {
      return <span className="status-badge amended">Amended</span>;
    }

    return <span className="status-badge pending">Pending</span>;
  };

  const canActAtStage = (request) => {
    return canDecideRequest(request);
  };

  const renderRequestActions = (request) => {
    const stage = request.current_stage;
    const isCompleted =
      request.current_stage === "completed" ||
      request.final_status === "approved" ||
      request.final_status === "rejected";
    const isBusy = updatingId === request.id;
    const processingLabel = isBusy ? "..." : null;

    return (
      <div className="request-action-group">
        <button
          className="pdf-btn action-icon-btn"
          title="View request details"
          disabled={isBusy}
          onClick={() => setViewingRequest(request)}
        >
          {processingLabel || "View"}
        </button>

        {!isCompleted &&
          canActAtStage(request) &&
          stage !== "protocol_clearance" &&
          stage !== "pm_office_submission" &&
          stage !== "pm_office_followup" &&
          stage !== "foreign_affairs_followup" &&
          stage !== "office_head_final" &&
          stage !== "minister_review" && (
            <>
              <button
                className="approve-btn action-icon-btn"
                title={getPrimaryActionLabel(request)}
                disabled={isBusy}
                onClick={() => updateStatus(request.id, "approve")}
              >
                {processingLabel || "Accept"}
              </button>

              <button
                className="reject-btn action-icon-btn"
                title="Reject or return for correction"
                disabled={isBusy}
                onClick={() => rejectRequest(request)}
              >
                {processingLabel || "Reject"}
              </button>
            </>
          )}

        {!isCompleted && canActAtStage(request) && stage === "protocol_clearance" && (
          <>
            <button
              className="approve-btn action-icon-btn"
              title="Clear protocol review"
              disabled={isBusy}
              onClick={() => updateStatus(request.id, "clear")}
            >
              {processingLabel || "Clear"}
            </button>

            <button
              className="edit-btn action-icon-btn"
              title="Request amendment"
              disabled={isBusy}
              onClick={() => amendRequest(request.id)}
            >
              Amend
            </button>
          </>
        )}

        {!isCompleted && canActAtStage(request) && stage === "office_head_final" && (
          <>
            <button
              className="approve-btn action-icon-btn"
              title={getPrimaryActionLabel(request)}
              disabled={isBusy}
              onClick={() => updateStatus(request.id, "approve")}
            >
              {processingLabel || "Approve"}
            </button>

            <button
              className="edit-btn action-icon-btn"
              title="Forward to Minister for decision"
              disabled={isBusy}
              onClick={() => updateStatus(request.id, "forward_to_minister")}
            >
              Forward to Minister
            </button>

            <button
              className="reject-btn action-icon-btn"
              title="Reject request"
              disabled={isBusy}
              onClick={() => rejectRequest(request)}
            >
              {processingLabel || "Reject"}
            </button>
          </>
        )}

        {!isCompleted && canActAtStage(request) && stage === "minister_review" && (
          <>
            <button
              className="approve-btn action-icon-btn"
              title={getPrimaryActionLabel(request)}
              disabled={isBusy}
              onClick={() => updateStatus(request.id, "approve")}
            >
              {processingLabel || "Approve"}
            </button>

            <button
              className="reject-btn action-icon-btn"
              title="Reject request"
              disabled={isBusy}
              onClick={() => rejectRequest(request)}
            >
              {processingLabel || "Reject"}
            </button>
          </>
        )}

        {!isCompleted && canActAtStage(request) && stage === "pm_office_submission" && (
          <button
            className="approve-btn action-icon-btn action-wide-btn"
            title="Submit selected traveler to PM Office"
            disabled={isBusy}
            onClick={() => updateStatus(request.id, "submit_to_pm_office")}
          >
            {processingLabel || "Submit PM"}
          </button>
        )}

        {!isCompleted &&
          canActAtStage(request) &&
          (stage === "pm_office_followup" ||
            stage === "foreign_affairs_followup") && (
            <>
              <button
                className="approve-btn action-icon-btn action-wide-btn"
                title="PM Office approved"
                disabled={isBusy}
                onClick={() =>
                  updatePmOfficeStatus(
                    request.id,
                    "pm_office_approved"
                  )
                }
              >
                {processingLabel || "PM OK"}
              </button>

              <button
                className="reject-btn action-icon-btn action-wide-btn"
                title="PM Office rejected"
                disabled={isBusy}
                onClick={() =>
                  updatePmOfficeStatus(
                    request.id,
                    "pm_office_rejected"
                  )
                }
              >
                {processingLabel || "PM Reject"}
              </button>
            </>
          )}

        {isTraveler &&
          request.current_stage === "expert_preparation" &&
          request.final_status === "amended" && (
            <>
              <button
                className="edit-btn action-icon-btn"
                title="Edit returned request"
                disabled={isBusy}
                onClick={() => setEditingRequest(request)}
              >
                Edit
              </button>

              <button
                className="approve-btn action-icon-btn"
                title="Resubmit corrected request"
                disabled={isBusy}
                onClick={() => resubmitRequest(request.id)}
              >
                {processingLabel || "Send"}
              </button>
            </>
          )}

        {canGenerateSupportLetter(request) && (
          <button
            className="pdf-btn action-icon-btn"
            title="Open PM Office support letter"
            disabled={isBusy}
            onClick={() => openPdf(request.id)}
          >
            Letter
          </button>
        )}

        {canDelete && (
          <button
            className="delete-btn action-icon-btn"
            title="Delete request"
            disabled={isBusy}
            onClick={() => deleteRequest(request.id)}
          >
            Del
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="table-container request-table-page">
      <div className="table-header request-table-header">
        <div>
          <span className="request-table-kicker">Travel Workflow</span>
          <h2>Submitted Requests</h2>
          <p>
            Review assigned travel requests, returned corrections, and completed history.
          </p>
        </div>

        <div className="request-header-actions">
          <button
            type="button"
            className="request-refresh-btn"
            onClick={fetchRequests}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          {canSeeHistorical && (
            <button
              type="button"
              className="request-history-toggle"
              onClick={() => setShowHistorical((prev) => !prev)}
            >
              {showHistorical ? "Hide Historical" : "Show Historical"}
              {historicalRequests.length > 0
                ? ` (${historicalRequests.length})`
                : ""}
            </button>
          )}
        </div>
      </div>

      <div className="request-summary-grid">
        {queueSummary.map((item, index) => (
          <div
            className={`request-summary-card tone-${index + 1}`}
            key={item.label}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.helper}</small>
          </div>
        ))}
      </div>

      {notice && (
        <div className={`request-notice ${notice.type}`}>
          {notice.message}
        </div>
      )}

      <div className="request-table-controls">
        <input
          type="text"
          placeholder="Search active requests..."
          className="search-input"
          value={activeSearch}
          onChange={(e) => setActiveSearch(e.target.value)}
        />

        <select
          className="search-input request-filter-select"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option value="all">All active requests</option>
          <option value="action">Needs my action</option>
          <option value="amended">Returned / amended</option>
          <option value="protocol">Protocol clearance</option>
          <option value="pm_office">PM Office</option>
        </select>
      </div>

      <div className="request-section-card">
        <div className="request-section-header">
          <div>
            <h3>Active Request Queue</h3>
            <p>{filteredSubmittedRequests.length} request{filteredSubmittedRequests.length === 1 ? "" : "s"} in this view</p>
          </div>

          {showBulkActions && (
            <div className="request-bulk-actions">
              <label className="request-bulk-select">
                <input
                  type="checkbox"
                  checked={allVisibleActionsSelected}
                  onChange={toggleAllVisibleActions}
                />
                Select actionable requests
              </label>

              <button
                type="button"
                className="approve-btn action-icon-btn request-bulk-submit"
                disabled={
                  updatingId === "bulk-approve" ||
                  selectedVisibleActionIds.length === 0
                }
                onClick={() => runBulkWorkflowAction("approve")}
              >
                {updatingId === "bulk-approve"
                  ? "Updating..."
                  : `Accept (${selectedVisibleActionIds.length})`}
              </button>

              <button
                type="button"
                className="reject-btn action-icon-btn request-bulk-submit"
                disabled={
                  updatingId === "bulk-reject" ||
                  selectedVisibleActionIds.length === 0
                }
                onClick={() => runBulkWorkflowAction("reject")}
              >
                {updatingId === "bulk-reject"
                  ? "Updating..."
                  : `Reject (${selectedVisibleActionIds.length})`}
              </button>
            </div>
          )}
        </div>

        <div className="request-table-scroll">
          <table>
            <thead>
              <tr>
                {showBulkActions && <th className="request-select-col">Select</th>}
                <th>Name</th>
                <th>Sector / Lead Executive Office</th>
                <th>Destination</th>
                <th>Purpose</th>
                <th>Travel Date</th>
                <th>Status</th>
                <th>Current Stage</th>
                <th>Comment</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    className="request-empty-cell"
                    colSpan={showBulkActions ? "10" : "9"}
                  >
                    <strong>Loading submitted requests...</strong>
                    <span>Please wait while the request queue refreshes.</span>
                  </td>
                </tr>
              ) : filteredSubmittedRequests.length === 0 ? (
                <tr>
                  <td
                    className="request-empty-cell"
                    colSpan={showBulkActions ? "10" : "9"}
                  >
                    <strong>No submitted requests found</strong>
                    <span>Try changing the search text or active request filter.</span>
                  </td>
                </tr>
              ) : (
                filteredSubmittedRequests.map((request) => (
                  <tr key={request.id}>
                    {showBulkActions && (
                      <td className="request-select-col">
                        {isBulkActionable(request) ? (
                          <input
                            type="checkbox"
                            checked={selectedActionIds.includes(request.id)}
                            onChange={() => toggleActionSelection(request.id)}
                            aria-label={`Select ${request.full_name || "request"} for bulk action`}
                          />
                        ) : (
                          <span className="request-select-placeholder">-</span>
                        )}
                      </td>
                    )}

                    {renderTravelerCell(request)}

                    {renderSectorDepartment(request)}

                    {renderWrappedText(request.country, "110px")}

                    {renderWrappedText(request.purpose, "240px")}

                    {renderTripDate(request)}

                    <td className="request-status-cell">{renderStatus(request)}</td>

                    <td>{renderStage(request)}</td>

                    {renderCommentCell(request)}

                    <td>{renderRequestActions(request)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canSeeHistorical && showHistorical && (
        <>
          <div
            className="table-header request-history-header"
          >
            <div>
              <h2>Historical Travel</h2>
              <p>Approved, rejected, and completed requests visible to your role.</p>
            </div>

            <input
              type="text"
              placeholder="Search historical travel..."
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="request-section-card">
            <div className="request-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Sector / Lead Executive Office</th>
                    <th>Destination</th>
                    <th>Purpose</th>
                    <th>Travel Date</th>
                    <th>Final Status</th>
                    <th>Current Stage</th>
                    {canViewPdf && <th>PDF</th>}
                  </tr>
                </thead>

                <tbody>
                  {historicalRequests.length === 0 ? (
                    <tr>
                      <td className="request-empty-cell" colSpan={canViewPdf ? "8" : "7"}>
                        <strong>No historical requests found</strong>
                        <span>Try changing the historical travel search text.</span>
                      </td>
                    </tr>
                  ) : (
                    historicalRequests.map((request) => (
                      <tr key={request.id}>
                        {renderTravelerCell(request)}

                        {renderSectorDepartment(request)}

                        {renderWrappedText(request.country, "110px")}

                        {renderWrappedText(request.purpose, "260px")}

                        {renderTripDate(request)}

                        <td className="request-status-cell">{renderFinalStatus(request)}</td>

                        <td>{renderStage(request)}</td>

                        {canViewPdf && (
                          <td>
                            {canGenerateSupportLetter(request) ? (
                              <button
                                className="pdf-btn"
                                onClick={() => openPdf(request.id)}
                              >
                                Letter
                              </button>
                            ) : (
                              <span className="request-muted-text">Pending</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {viewingRequest && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <h2>Travel Request Details</h2>

            <div className="request-detail-grid">
              <div>
                <strong>Workflow</strong>
                <p>{formatWorkflowType(viewingRequest.workflow_type)}</p>
              </div>

              <div>
                <strong>Traveler Category</strong>
                <p>{viewingRequest.traveler_category || "-"}</p>
              </div>

              <div>
                <strong>Organization</strong>
                <p>{viewingRequest.organization_name || "-"}</p>
              </div>

              <div>
                <strong>Traveler Name</strong>
                <p>{viewingRequest.full_name || "-"}</p>
              </div>

              <div>
                <strong>Position</strong>
                <p>{viewingRequest.position || "-"}</p>
              </div>

              <div>
                <strong>Sector</strong>
                <p>{viewingRequest.sector || "-"}</p>
              </div>

              <div>
                <strong>
                  {viewingRequest.traveler_category === "affiliate_institution"
                    ? "Department"
                    : "Lead Executive Office"}
                </strong>
                <p>{viewingRequest.department || "-"}</p>
              </div>

              <div>
                <strong>Email</strong>
                <p>{viewingRequest.email || "-"}</p>
              </div>

              <div>
                <strong>Phone</strong>
                <p>{viewingRequest.phone || "-"}</p>
              </div>

              <div>
                <strong>Destination Country</strong>
                <p>{viewingRequest.country || "-"}</p>
              </div>

              <div>
                <strong>Start Date</strong>
                <p>{formatDate(viewingRequest.start_date)}</p>
              </div>

              <div>
                <strong>End Date</strong>
                <p>{formatDate(viewingRequest.end_date)}</p>
              </div>

              <div>
                <strong>Number of Days</strong>
                <p>
                  {getTripDays(
                    viewingRequest.start_date,
                    viewingRequest.end_date
                  )}{" "}
                  Days
                </p>
              </div>

              <div>
                <strong>Sponsor</strong>
                <p>{viewingRequest.sponsor || "-"}</p>
              </div>

              <div>
                <strong>Passport Number</strong>
                <p>{viewingRequest.passport_number || "-"}</p>
              </div>

              <div>
                <strong>Status</strong>
                <p>{viewingRequest.status || "-"}</p>
              </div>

              <div>
                <strong>Current Stage</strong>
                <p>{formatStage(viewingRequest.current_stage)}</p>
              </div>

              <div>
                <strong>PM Office Status</strong>
                <p>{viewingRequest.foreign_affairs_status || "-"}</p>
              </div>

              <div className="detail-full">
                <strong>Purpose of Travel</strong>
                <p>{viewingRequest.purpose || "-"}</p>
              </div>

              {(viewingRequest.amendment_comment ||
                viewingRequest.decision_comment ||
                viewingRequest.foreign_affairs_comment) && (
                <div className="detail-full">
                  <strong>Comment</strong>
                  <p>
                    {viewingRequest.amendment_comment ||
                      viewingRequest.decision_comment ||
                      viewingRequest.foreign_affairs_comment}
                  </p>
                </div>
              )}
            </div>

            <h3 style={{ marginTop: "25px" }}>Attached Documents</h3>

            <div className="attachment-review">
              {viewingRequest.passport_file ? (
                <a
                  href={getUploadUrl(viewingRequest.passport_file)}
                  target="_blank"
                  rel="noreferrer"
                  className="attachment-card"
                >
                  <div className="attachment-title">Passport Copy</div>
                  <div className="attachment-name">
                    {viewingRequest.passport_file}
                  </div>
                </a>
              ) : (
                <div className="attachment-empty">No Passport Uploaded</div>
              )}

              {viewingRequest.invitation_letter ? (
                <a
                  href={getUploadUrl(viewingRequest.invitation_letter)}
                  target="_blank"
                  rel="noreferrer"
                  className="attachment-card"
                >
                  <div className="attachment-title">Invitation Letter</div>
                  <div className="attachment-name">
                    {viewingRequest.invitation_letter}
                  </div>
                </a>
              ) : (
                <div className="attachment-empty">
                  No Invitation Letter Uploaded
                </div>
              )}

              {viewingRequest.tor_file ? (
                <a
                  href={getUploadUrl(viewingRequest.tor_file)}
                  target="_blank"
                  rel="noreferrer"
                  className="attachment-card"
                >
                  <div className="attachment-title">TOR Document</div>
                  <div className="attachment-name">{viewingRequest.tor_file}</div>
                </a>
              ) : (
                <div className="attachment-empty">No TOR Uploaded</div>
              )}
            </div>

            <div className="modal-actions">
              {canTravelerEditBeforeAction(viewingRequest) && (
                <button
                  className="approve-btn"
                  onClick={() => {
                    setEditingRequest(viewingRequest);
                    setViewingRequest(null);
                  }}
                >
                  Edit Request
                </button>
              )}

              <button
                className="delete-btn"
                onClick={() => setViewingRequest(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editingRequest && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <h2>
              {editingRequest.final_status === "amended"
                ? "Edit Returned Request"
                : "Edit Travel Request"}
            </h2>

            {editingRequest.final_status === "amended" ? (
              <div className="notice-error">
                <strong>Correction / Amendment Comment:</strong>
                <br />
                {editingRequest.amendment_comment ||
                  editingRequest.decision_comment ||
                  "Please update the request as required."}
              </div>
            ) : (
              <div className="request-notice success">
                No approver action has been recorded yet. You can update the
                request details without resubmitting the workflow.
              </div>
            )}

            <div className="request-detail-grid">
              <div>
                <strong>Workflow Type</strong>
                <select
                  className="ministry-input"
                  value={editingRequest.workflow_type || ""}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      workflow_type: e.target.value,
                    })
                  }
                >
                  <option value="ceo_structure">CEO Structure</option>
                  <option value="office_head_structure">
                    Office Head Structure
                  </option>
                  <option value="sector_structure">Sector Structure</option>
                </select>
              </div>

              <div>
                <strong>Traveler Category</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.traveler_category || ""}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      traveler_category: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Organization Name</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.organization_name || ""}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      organization_name: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Full Name</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.full_name || ""}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      full_name: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Position</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.position || ""}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      position: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Sector</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.sector || ""}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      sector: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Department</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.department || ""}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      department: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Email</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.email || ""}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      email: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Phone</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.phone || ""}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      phone: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Destination Country</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.country || ""}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      country: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Start Date</strong>
                <input
                  type="date"
                  className="ministry-input"
                  value={getInputDate(editingRequest.start_date)}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      start_date: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>End Date</strong>
                <input
                  type="date"
                  className="ministry-input"
                  value={getInputDate(editingRequest.end_date)}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      end_date: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Sponsor</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.sponsor || ""}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      sponsor: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <strong>Passport Number</strong>
                <input
                  className="ministry-input"
                  value={editingRequest.passport_number || ""}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      passport_number: e.target.value,
                    })
                  }
                />
              </div>

              <div className="detail-full">
                <strong>Purpose of Travel</strong>
                <textarea
                  className="ministry-input"
                  rows={4}
                  value={editingRequest.purpose || ""}
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      purpose: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <h3 style={{ marginTop: "25px" }}>Update Attachments</h3>

            <div className="attachment-review">
              <div className="attachment-empty">
                <strong>Passport Copy</strong>
                <br />
                Current: {editingRequest.passport_file || "Not uploaded"}
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      passportFile: e.target.files?.[0],
                    })
                  }
                />
              </div>

              <div className="attachment-empty">
                <strong>Invitation Letter</strong>
                <br />
                Current: {editingRequest.invitation_letter || "Not uploaded"}
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      invitationLetter: e.target.files?.[0],
                    })
                  }
                />
              </div>

              <div className="attachment-empty">
                <strong>TOR Document</strong>
                <br />
                Current: {editingRequest.tor_file || "Not uploaded"}
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  onChange={(e) =>
                    setEditingRequest({
                      ...editingRequest,
                      torFile: e.target.files?.[0],
                    })
                  }
                />
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="approve-btn"
                disabled={updatingId === editingRequest.id}
                onClick={updateRequest}
              >
                Save Changes
              </button>

              {editingRequest.final_status === "amended" && (
                <button
                  className="approve-btn"
                  disabled={updatingId === editingRequest.id}
                  onClick={async () => {
                    await updateRequest();
                    await resubmitRequest(editingRequest.id);
                    setEditingRequest(null);
                  }}
                >
                  Save and Resubmit
                </button>
              )}

              <button
                className="delete-btn"
                onClick={() => setEditingRequest(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestTable;
