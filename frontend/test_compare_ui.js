// Simulate the WorldClassMessage logic
const data = {
  "title": "Peer Comparison",
  "icon": "⚖️",
  "headers": [
    "Metric",
    "COMI",
    "QNBE",
    "HDBK"
  ],
  "rows": [
    {
      "metric": "Market Cap",
      "values": [
        "89.99B",
        "58.89B",
        "70.00B"
      ],
      "winner_symbol": "COMI"
    }
  ]
};

const symbolToColIdx = {};
if (data.headers?.length) {
    data.headers.forEach((h, idx) => {
        if (idx > 0) symbolToColIdx[h] = idx;
    });
}

console.log("Headers:", data.headers);
console.log("Map:", symbolToColIdx);

data.rows.forEach(row => {
    const winnerCol = row.winner_symbol ? symbolToColIdx[row.winner_symbol] : -1;
    console.log("Row:", row.metric, "WinnerCol:", winnerCol);
    
    // Simulate the exact map function we have in JSX
    const vals = (row.values || (row.cells && (row.metric ? row.cells : row.cells.slice(1)).map(c => c.value)) || []);
    console.log("Values array to map:", vals);
    
    vals.forEach((val, cellIdx) => {
        const isWinner = (cellIdx + 1) === winnerCol;
        const actualCellIdx = (row.cells && !row.metric && !row.values) ? cellIdx + 1 : cellIdx;
        const cellHighlight = row.cells?.[actualCellIdx]?.highlight;
        console.log(`  Cell [${cellIdx}]: ${val} (isWinner: ${isWinner}, highlight: ${cellHighlight})`);
    });
});
