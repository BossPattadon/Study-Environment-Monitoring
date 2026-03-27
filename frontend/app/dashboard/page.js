"use client";

import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";
import { fetchSensors } from "../../services/api";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

export default function Dashboard() {
    const [chartData, setChartData] = useState({
        labels: [],
        datasets: [],
    });

    useEffect(() => {
        async function loadData() {
        try {
            const data = await fetchSensors();

            const labels = data.map((item) =>
            new Date(item.timestamp).toLocaleTimeString()
            );

            const temperatures = data.map((item) => item.temperature);
            const humidity = data.map((item) => item.humidity);

            setChartData({
                labels,
                datasets: [
                    {
                        label: "Temperature (°C)",
                        data: temperatures,
                        borderColor: "rgba(255, 99, 132, 1)",
                        backgroundColor: "rgba(255, 99, 132, 0.2)",
                        yAxisID: "y1",
                    },
                    {
                        label: "Humidity (%)",
                        data: humidity,
                        borderColor: "rgba(54, 162, 235, 1)",
                        backgroundColor: "rgba(54, 162, 235, 0.2)",
                        yAxisID: "y2",
                    },
                ],
            });
        } catch (err) {
            console.error(err);
        }
    }

        loadData();
    }, []);

    const options = {
        responsive: true,
        interaction: {
        mode: "index",
        intersect: false,
        },
        stacked: false,
        plugins: {
        title: {
            display: true,
            text: "Sensor Data",
            font: { size: 18 },
        },
        },
        scales: {
        y1: {
            type: "linear",
            display: true,
            position: "left",
            title: { display: true, text: "Temperature (°C)" },
        },
        y2: {
            type: "linear",
            display: true,
            position: "right",
            title: { display: true, text: "Humidity (%)" },
            grid: { drawOnChartArea: false },
        },
        },
    };

    return (
        <div className="p-4 bg-white rounded-lg shadow-md">
        <Line data={chartData} options={options} />
        </div>
    );
}