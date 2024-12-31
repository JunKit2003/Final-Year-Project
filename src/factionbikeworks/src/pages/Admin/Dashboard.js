import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AdminDashboard() {
    const [analyticsData, setAnalyticsData] = useState([]);

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const response = await axios.get('http://localhost:8000/api/analytics');
                setAnalyticsData(response.data.rows);
            } catch (error) {
                console.error('Error fetching analytics data:', error);
            }
        }

        fetchAnalytics();
    }, []);

    return (
        <div>
            <h2>Google Analytics Overview</h2>
            <table>
                <thead>
                    <tr>
                        <th>City</th>
                        <th>Sessions</th>
                    </tr>
                </thead>
                <tbody>
                    {analyticsData.map((row, index) => (
                        <tr key={index}>
                            <td>{row.dimensionValues[0].value}</td>
                            <td>{row.metricValues[0].value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default AdminDashboard;
