import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

function AdminDashboard() {
    const [analyticsData, setAnalyticsData] = useState([]);

    useEffect(() => {
        async function fetchAnalytics() {
            try {
                const response = await axios.get(`${process.env.REACT_APP_BACKEND_HOST}/api/analytics`);
                setAnalyticsData(response.data.rows);
            } catch (error) {
                console.error('Error fetching analytics data:', error);
            }
        }

        fetchAnalytics();
    }, []);

    return (
        <Box sx={{ bgcolor: "background.default", color: "text.primary", minHeight: "100vh", padding: 4 }}>
            <Typography variant="h4" gutterBottom>
                Google Analytics Overview
            </Typography>

            <TableContainer component={Paper} sx={{ bgcolor: "background.paper" }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: "bold" }}>City</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>Sessions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {analyticsData.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell>{row.dimensionValues[0].value}</TableCell>
                                <TableCell>{row.metricValues[0].value}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

export default AdminDashboard;
