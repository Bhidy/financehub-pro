// CSV Export Utility Functions

export const exportToCSV = (data: Record<string, unknown>[], filename: string) => {
    if (!data || data.length === 0) {
        alert("No data to export");
        return;
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
        headers.join(","), // Header row
        ...data.map(row =>
            headers.map(header => {
                const value = row[header];
                // Handle values with commas or quotes
                if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value ?? "";
            }).join(",")
        )
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function exportTableToCSV(tableId: string, filename: string) {
    const table = document.getElementById(tableId) as HTMLTableElement;
    if (!table) {
        alert("Table not found");
        return;
    }

    const rows: string[] = [];

    // Get headers
    const headerCells = table.querySelectorAll("thead th");
    const headers: string[] = [];
    headerCells.forEach(cell => {
        headers.push(cell.textContent?.trim() || "");
    });
    rows.push(headers.join(","));

    // Get data rows
    const bodyRows = table.querySelectorAll("tbody tr");
    bodyRows.forEach(row => {
        const cells = row.querySelectorAll("td");
        const rowData: string[] = [];
        cells.forEach(cell => {
            let value = cell.textContent?.trim() || "";
            // Handle values with commas
            if (value.includes(",")) {
                value = `"${value}"`;
            }
            rowData.push(value);
        });
        rows.push(rowData.join(","));
    });

    // Create and download
    const csvContent = rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
