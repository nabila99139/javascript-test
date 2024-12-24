class AnalysisPlotter {
    constructor(plotId) {
      this.plotId = plotId;
    }
  
    plot(data, title) {
      const ctx = document.getElementById(this.plotId).getContext("2d");
      const chartData = {
        labels: data.map((point) => point.x.toFixed(2)),
        datasets: [
          {
            label: title,
            data: data.map((point) => point.y),
            borderColor: "blue",
            fill: false,
          },
        ],
      };
  
      new Chart(ctx, {
        type: "line",
        data: chartData,
        options: {
          responsive: true,
          scales: {
            x: {
              title: { display: true, text: "Distance (m)" },
            },
            y: {
              title: { display: true, text: "Shear Force (kN)" },
            },
          },
        },
      });
    }
  }
  