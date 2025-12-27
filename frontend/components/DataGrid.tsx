"use client";

import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
    ColumnDef,
    SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import clsx from "clsx";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface DataGridProps<T> {
    data: T[];
    columns: ColumnDef<T, any>[];
    className?: string;
}

export default function DataGrid<T>({ data, columns, className }: DataGridProps<T>) {
    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({
        data,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className={clsx("w-full overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200", className)}>
            <table className="w-full text-left text-xs border-collapse font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-slate-500">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                                <th
                                    key={header.id}
                                    colSpan={header.colSpan}
                                    className="px-6 py-3 font-bold font-sans cursor-pointer hover:bg-slate-100 transition-colors select-none whitespace-nowrap"
                                    onClick={header.column.getToggleSortingHandler()}
                                >
                                    <div className="flex items-center gap-1 group">
                                        {flexRender(header.column.columnDef.header, header.getContext())}
                                        {header.column.getIsSorted() ? (
                                            header.column.getIsSorted() === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />
                                        ) : (
                                            <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 text-slate-400" />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {table.getRowModel().rows.map((row) => (
                        <tr
                            key={row.id}
                            className="hover:bg-slate-50 transition-colors group"
                        >
                            {row.getVisibleCells().map((cell) => (
                                <td key={cell.id} className="px-6 py-3 text-slate-900 font-medium whitespace-nowrap">
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
