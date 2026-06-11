"use client";
import React, { useEffect, useState } from 'react';
import { ReactFlow, Controls, Background, Node, Edge, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, Loader2, Calculator, Settings2, Wallet, Percent, User } from 'lucide-react';

const CustomNode = ({ data }: any) => (
  <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 min-w-[320px] overflow-hidden relative">
    <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-indigo-400 border-2 border-white" />
    <div className={`absolute top-0 left-0 w-full h-1.5 ${data.stripeColor || 'bg-slate-200'}`}></div>
    <div className="flex items-center gap-4 mb-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${data.color || 'bg-slate-100 text-slate-600'}`}>
        {data.icon}
      </div>
      <h3 className="font-black text-lg text-slate-800 tracking-tight">{data.title}</h3>
    </div>
    <div className="text-sm text-slate-600 leading-relaxed font-medium space-y-1">
      {data.content && data.content.split('\n').map((line: string, i: number) => {
        if (line.includes(':')) {
            const [k, v] = line.split(':');
            return <div key={i} className="flex justify-between items-center"><span className="text-slate-400">{k}</span><span className="font-bold text-slate-800">{v}</span></div>;
        }
        return <div key={i}>{line}</div>;
      })}
    </div>
    {data.tableData && (
        <div className="mt-4 rounded-lg overflow-hidden border border-slate-200">
            <table className="w-full text-[11px] text-center border-collapse">
                <thead className="bg-slate-100 text-slate-600">
                    <tr>
                        {data.tableData.headers.map((h: string, idx: number) => (
                            <th key={idx} className="border border-slate-200 p-1.5 font-bold whitespace-nowrap">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.tableData.rows.map((row: any, rIdx: number) => (
                        <tr key={rIdx} className={row.highlighted ? "bg-amber-50" : ""}>
                            {row.cells.map((c: any, cIdx: number) => (
                                <td key={cIdx} className={`border border-slate-200 p-1.5 ${c.highlighted ? "bg-amber-200 font-bold text-amber-900" : "text-slate-600"}`}>{c.val}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )}
    <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-indigo-400 border-2 border-white" />
  </div>
);

const nodeTypes = { custom: CustomNode };

export default function TraceEngine({ record, onClose }: { record: any, onClose: () => void }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    if (record) {
      generateFlow(record);
    }
  }, [record]);

  const generateFlow = (record: any) => {
    const formatCurrency = (amt: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
    
    let nodesList: Node[] = [];
    let edgesList: Edge[] = [];
    
    // 1. Input Node
    nodesList.push({
      id: 'input',
      type: 'custom',
      position: { x: 50, y: 150 },
      data: {
        title: 'Input Parameters',
        stripeColor: 'bg-indigo-500',
        color: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
        icon: <User className="w-6 h-6" />,
        content: `Name: ${record.name}\nDesignation: ${record.designation}\nVintage: ${record.vintage} Days\nSalary: ${formatCurrency(record.salary)}\nTotal Collection: ${formatCurrency(record.total_collection)}`
      }
    });

    // 2. Rule Selected Node
    let ruleName = "";
    let mathStr = "";
    if (record.designation?.toLowerCase().includes('leader') || record.designation?.toLowerCase() === 'tl') {
        ruleName = "Team Leader Percent Slab";
        mathStr = `Team Collection: ${formatCurrency(record.team_collection)}\nHeadcount: ${record.team_headcount}\nPCP: ${formatCurrency(record.pcp)}\nApplied Rate: ${record.incentive_percent}`;
    } else if (record.designation?.toLowerCase().includes('manager') || record.designation?.toLowerCase() === 'am') {
        ruleName = "AM Percent Slab";
        mathStr = `Team Collection: ${formatCurrency(record.team_collection)}\nHeadcount: ${record.team_headcount}\nPCP: ${formatCurrency(record.pcp)}\nApplied Rate: ${record.incentive_percent}`;
    } else {
        if (record.vintage <= 120) {
            ruleName = "Associate Fixed Slab";
            mathStr = `Rule: Vintage <= 120 Days\nLogic: Fixed Tier Table lookup\nTarget: ${formatCurrency(record.total_collection)}`;
        } else {
            ruleName = "Associate Tenured Percentage";
            mathStr = `Rule: Vintage > 120 Days\nLogic: Percentage logic\nSalary Check: ${formatCurrency(record.salary)}\nApplied Rate: ${record.incentive_percent}`;
        }
    }

    let formulaNodeText = "";
    let formulaTableData: any = null;

    if (record.designation?.toLowerCase().includes('leader') || record.designation?.toLowerCase() === 'tl') {
        formulaNodeText = "";
        const targets = [200000, 215000, 230000, 250000, 270000, 300000];
        const rates = ['0.45%', '0.60%', '0.70%', '0.80%', '1.00%', '1.15%'];
        const additional = ['', '', '1,449', '2,700', '4,860', '7,763'];
        const ztText = ['', '', 'With 0 ZT', 'With 0 ZT', 'With 0 ZT', 'With 0 ZT'];
        const deductRules = ['1 ZT - 50% Incentive', '2 ZT - 100% Incentive', '2,174', '2,700', '3,645', '4,658'];
        const headcount = record.team_headcount || 1;
        
        let rowHighlightIdx = -1;
        for (let i = targets.length - 1; i >= 0; i--) {
            if (record.pcp >= targets[i]) {
                rowHighlightIdx = i; break;
            }
        }

        formulaTableData = {
            headers: ['PCP', 'Headcount', 'Total Recovery', 'Incentive', 'Amount', 'Additional', 'ZT', 'Deduction'],
            rows: targets.map((t, i) => {
                const totalRecovery = t * headcount;
                const amt = totalRecovery * (parseFloat(rates[i]) / 100);
                return {
                    highlighted: i === rowHighlightIdx,
                    cells: [
                        { val: formatCurrency(t), highlighted: i === rowHighlightIdx },
                        { val: headcount.toString(), highlighted: false },
                        { val: formatCurrency(totalRecovery), highlighted: false },
                        { val: rates[i], highlighted: i === rowHighlightIdx },
                        { val: formatCurrency(amt), highlighted: i === rowHighlightIdx },
                        { val: additional[i], highlighted: false },
                        { val: ztText[i], highlighted: false },
                        { val: deductRules[i], highlighted: false }
                    ]
                };
            })
        };
    } else if (record.designation?.toLowerCase().includes('manager') || record.designation?.toLowerCase() === 'am') {
        formulaNodeText = "";
        const targets = [215000, 225000, 235000, 240000, 250000, 275000];
        const rates = ['0.12%', '0.20%', '0.25%', '0.30%', '0.35%', '0.40%'];
        const additional = ['', '', '1,763', '3,240', '5,250', '8,250'];
        const ztText = ['', '', 'With 0 ZT', 'With 0 ZT', 'With 0 ZT', 'With 0 ZT'];
        const deductRules = ['1 ZT - 25% Incentive', '2 ZT - 50% Incentive', '', '', '', ''];
        const headcount = record.team_headcount || 1;
        
        let rowHighlightIdx = -1;
        for (let i = targets.length - 1; i >= 0; i--) {
            if (record.pcp >= targets[i]) {
                rowHighlightIdx = i; break;
            }
        }

        formulaTableData = {
            headers: ['PCP', 'Headcount', 'Total Recovery', 'Incentive', 'Amount', 'Additional', 'ZT', 'Deduction if any defect is there'],
            rows: targets.map((t, i) => {
                const totalRecovery = t * headcount;
                const amt = totalRecovery * (parseFloat(rates[i]) / 100);
                return {
                    highlighted: i === rowHighlightIdx,
                    cells: [
                        { val: formatCurrency(t), highlighted: i === rowHighlightIdx },
                        { val: headcount.toString(), highlighted: false },
                        { val: formatCurrency(totalRecovery), highlighted: false },
                        { val: rates[i], highlighted: i === rowHighlightIdx },
                        { val: formatCurrency(amt), highlighted: i === rowHighlightIdx },
                        { val: additional[i], highlighted: false },
                        { val: ztText[i], highlighted: false },
                        { val: deductRules[i], highlighted: false }
                    ]
                };
            })
        };
    } else {
        if (record.vintage <= 120) {
            formulaNodeText = ""; 
            
            let targetColIdx = 1;
            if (record.vintage <= 30) targetColIdx = 1;
            else if (record.vintage <= 60) targetColIdx = 2;
            else if (record.vintage <= 90) targetColIdx = 3;
            else targetColIdx = 4;

            const targets = [25000, 50000, 75000, 100000, 150000, 175000, 200000, 250000, 300000, 350000, 400000];
            const m0 = [500, 1000, 2000, 3000, 4000, 5000, 6000, 7500, 9000, 10500, 16000];
            const m1 = ['', 0, 500, 1500, 2750, 3500, 5000, 7500, 9000, 10500, 16000];
            const m2 = ['', '', '', 500, 2500, 3375, 4000, 7500, 9000, 10500, 16000];
            const m3 = ['', '', '', '', 1000, 2000, 4000, 7500, 9000, 10500, 16000];

            let rowHighlightIdx = -1;
            for (let i = targets.length - 1; i >= 0; i--) {
                if (record.total_collection >= targets[i]) {
                    rowHighlightIdx = i; break;
                }
            }

            formulaTableData = {
                headers: ['TARGET', '0 M', '1 M', '2 M', '3 M'],
                rows: targets.map((t, i) => ({
                    highlighted: i === rowHighlightIdx,
                    cells: [
                        { val: formatCurrency(t), highlighted: i === rowHighlightIdx },
                        { val: formatCurrency(Number(m0[i])), highlighted: i === rowHighlightIdx && targetColIdx === 1 },
                        { val: m1[i] !== '' ? formatCurrency(Number(m1[i])) : '', highlighted: i === rowHighlightIdx && targetColIdx === 2 },
                        { val: m2[i] !== '' ? formatCurrency(Number(m2[i])) : '', highlighted: i === rowHighlightIdx && targetColIdx === 3 },
                        { val: m3[i] !== '' ? formatCurrency(Number(m3[i])) : '', highlighted: i === rowHighlightIdx && targetColIdx === 4 }
                    ]
                }))
            };
        } else {
            formulaNodeText = "";
            
            let targetColIdx = 1;
            const s = record.salary;
            if (s < 16000) targetColIdx = 1;
            else if (s >= 16000 && s <= 18000) targetColIdx = 2;
            else if (s > 18000 && s <= 24000) targetColIdx = 3;
            else targetColIdx = 4;

            const targets = [225000, 260000, 280000, 300000, 350000, 400000];
            const s1 = ['2.50%', '2.50%', '2.50%', '3.00%', '3.25%', '4.00%'];
            const s2 = ['0.00%', '2.50%', '2.50%', '3.00%', '3.25%', '4.00%'];
            const s3 = ['0.00%', '0.00%', '2.50%', '3.00%', '3.25%', '4.00%'];
            const s4 = ['0.00%', '0.00%', '0.00%', '0.00%', '3.25%', '4.00%'];

            let rowHighlightIdx = -1;
            for (let i = targets.length - 1; i >= 0; i--) {
                if (record.total_collection >= targets[i]) {
                    rowHighlightIdx = i; break;
                }
            }

            formulaTableData = {
                headers: ['Coll.', '<16k', '16-18k', '18-24k', '>24k'],
                rows: targets.map((t, i) => ({
                    highlighted: i === rowHighlightIdx,
                    cells: [
                        { val: formatCurrency(t), highlighted: i === rowHighlightIdx },
                        { val: s1[i], highlighted: i === rowHighlightIdx && targetColIdx === 1 },
                        { val: s2[i], highlighted: i === rowHighlightIdx && targetColIdx === 2 },
                        { val: s3[i], highlighted: i === rowHighlightIdx && targetColIdx === 3 },
                        { val: s4[i], highlighted: i === rowHighlightIdx && targetColIdx === 4 }
                    ]
                }))
            };
        }
    }

    nodesList.push({
      id: 'rule',
      type: 'custom',
      position: { x: 420, y: 150 },
      data: {
        title: 'Calculation Engine',
        stripeColor: 'bg-amber-500',
        color: 'bg-amber-50 text-amber-600 border border-amber-100',
        icon: <Settings2 className="w-6 h-6" />,
        content: `Selected Slab: ${ruleName}\n${mathStr}`
      }
    });

    // 3. Formula Node
    nodesList.push({
      id: 'formula',
      type: 'custom',
      position: { x: 790, y: 150 },
      data: {
        title: 'Applied Matrix Lookup',
        stripeColor: 'bg-rose-500',
        color: 'bg-rose-50 text-rose-600 border border-rose-100',
        icon: <Percent className="w-6 h-6" />,
        content: formulaNodeText,
        tableData: formulaTableData
      }
    });

    // 4. Output Node
    nodesList.push({
      id: 'output',
      type: 'custom',
      position: { x: 1160, y: 150 },
      data: {
        title: `${new Date().toLocaleString('en-US', { month: 'long' })} Payout`,
        stripeColor: 'bg-emerald-500',
        color: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
        icon: <Wallet className="w-6 h-6" />,
        content: `Earned Incentive: ${formatCurrency(record.final_incentive || record.incentive || 0)}`
      }
    });

    edgesList.push({ id: 'e1', source: 'input', target: 'rule', animated: true, style: { stroke: '#64748b', strokeWidth: 2 } });
    edgesList.push({ id: 'e2', source: 'rule', target: 'formula', animated: true, style: { stroke: '#f43f5e', strokeWidth: 2 } });
    edgesList.push({ id: 'e3', source: 'formula', target: 'output', animated: true, style: { stroke: '#10b981', strokeWidth: 3 } });

    setNodes(nodesList);
    setEdges(edgesList);
  };

  return (
    <div className="flex flex-col h-[50vh] bg-slate-50 w-full border-b border-slate-200 shadow-inner relative">
      <div className="absolute top-4 right-4 z-20">
        <button onClick={onClose} className="w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center hover:bg-slate-100 shadow-sm transition-colors text-slate-500">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="absolute top-4 left-6 z-10 bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200 shadow-sm pointer-events-none">
          <h2 className="text-sm font-black text-slate-800">Incentive Trace Engine</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{record.name} ({record.employee_id})</p>
      </div>
      <div className="flex-1 w-full relative">
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          nodeTypes={nodeTypes}
          fitView
          className="bg-slate-50/50"
        >
          <Background color="#cbd5e1" gap={20} size={2} />
          <Controls className="bg-white border-slate-200 shadow-lg rounded-xl overflow-hidden" />
        </ReactFlow>
      </div>
    </div>
  );
}
