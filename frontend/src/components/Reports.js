import { useEffect, useState } from 'react';
import API from '../services/api';

function Reports() {

  const [requests, setRequests] = useState([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {

    try {

      const response =
        await API.get('/requests');

      setRequests(response.data);

    } catch (error) {

      console.error(error);
    }
  };

  const approved = requests.filter(
    (r) => r.status === 'Approved'
  ).length;

  const pending = requests.filter(
    (r) => r.status === 'Pending'
  ).length;

  const rejected = requests.filter(
    (r) => r.status === 'Rejected'
  ).length;

  return (

    <div className="page-container">

      <h2>FTMS Reports</h2>

      <div className="report-grid">

        <div className="report-card">
          <h3>Total Requests</h3>
          <p>{requests.length}</p>
        </div>

        <div className="report-card approved-report">
          <h3>Approved</h3>
          <p>{approved}</p>
        </div>

        <div className="report-card pending-report">
          <h3>Pending</h3>
          <p>{pending}</p>
        </div>

        <div className="report-card rejected-report">
          <h3>Rejected</h3>
          <p>{rejected}</p>
        </div>

      </div>

      <div className="report-table-container">

        <h3>Travel Request Summary</h3>

        <table>

          <thead>

            <tr>
              <th>Name</th>
              <th>Department</th>
              <th>Country</th>
              <th>Status</th>
            </tr>

          </thead>

          <tbody>

            {requests.map((request) => (

              <tr key={request.id}>

                <td>{request.full_name}</td>

                <td>{request.department}</td>

                <td>{request.country}</td>

                <td>{request.status}</td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default Reports;