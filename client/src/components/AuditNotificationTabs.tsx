import React, { useState } from 'react';
import { Bell, History, Inbox, Flame, PlusCircle, Sparkles } from 'lucide-react';
import { ServiceRequest, Notification, AuditLog, Assignment } from '../types';

interface AuditNotificationTabsProps {
  requests: ServiceRequest[];
  assignments: Assignment[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  onOpenCreateOrder?: () => void;
  onLoadBenchmark?: () => void;
}

export const AuditNotificationTabs: React.FC<AuditNotificationTabsProps> = ({
  requests,
  assignments,
  notifications,
  auditLogs,
  onOpenCreateOrder,
  onLoadBenchmark,
}) => {
  const [activeTab, setActiveTab] = useState<'backlog' | 'notifications' | 'audit'>('backlog');

  const assignedReqIds = new Set(assignments.map(a => a.serviceRequestId));
  const unassignedRequests = requests.filter(r => !assignedReqIds.has(r.id));

  return (
    <div className="bg-[#FFFFFF] border border-[#DAD3C9] rounded-2xl overflow-hidden shadow-md">
      {/* Tabs Header */}
      <div className="flex border-b border-[#DAD3C9] bg-[#F2EDE3]/70 px-4">
        <button
          onClick={() => setActiveTab('backlog')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'backlog'
              ? 'border-[#07171D] text-[#102025]'
              : 'border-transparent text-[#6B675E] hover:text-[#102025]'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Unassigned Work Orders ({unassignedRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'notifications'
              ? 'border-[#07171D] text-[#102025]'
              : 'border-transparent text-[#6B675E] hover:text-[#102025]'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Simulated Technician Alerts ({notifications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-[#07171D] text-[#102025]'
              : 'border-transparent text-[#6B675E] hover:text-[#102025]'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Immutable Audit Ledger ({auditLogs.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-5 max-h-72 overflow-y-auto bg-[#FFFFFF]">
        {activeTab === 'backlog' && (
          <div>
            {requests.length === 0 ? (
              <div className="py-8 px-4 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-[#F2EDE3] border border-[#DAD3C9] flex items-center justify-center text-[#294047] mb-3 shadow-inner">
                  <Inbox className="w-6 h-6 text-[#294047]" />
                </div>
                <h4 className="text-sm font-bold text-[#102025]">Dispatch Backlog is Empty (0 Work Orders)</h4>
                <p className="text-xs text-[#6B675E] mt-1 mb-4">
                  The fleet is active on shift. Create custom service orders or load a benchmark scenario for fast evaluation.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {onOpenCreateOrder && (
                    <button
                      onClick={onOpenCreateOrder}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#FFFDF8] bg-[#07171D] hover:bg-[#102025] rounded-xl transition-all shadow-sm"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-[#A9DFCB]" />
                      <span>+ Create Custom Work Order</span>
                    </button>
                  )}
                  {onLoadBenchmark && (
                    <button
                      onClick={onLoadBenchmark}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#102025] bg-[#FBF8F1] border border-[#DAD3C9] hover:bg-[#F2EDE3] rounded-xl transition-all shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#294047]" />
                      <span>⚡ Load 10 Benchmark Orders</span>
                    </button>
                  )}
                </div>
              </div>
            ) : unassignedRequests.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#2A6E57] bg-[#EBF8F4] border border-[#A9DFCB] rounded-xl font-medium">
                ✓ All {requests.length} work orders have been successfully assigned to technicians.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {unassignedRequests.map(req => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl bg-[#FBF8F1] border border-[#DAD3C9] flex flex-col justify-between gap-1.5 text-xs shadow-sm"
                  >
                    <div className="flex items-center justify-between font-mono">
                      <span className="font-bold text-[#102025] flex items-center gap-1.5">
                        {req.priority === 'EMERGENCY' && <Flame className="w-3.5 h-3.5 text-[#C24D28]" />}
                        {req.id}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                        req.priority === 'EMERGENCY'
                          ? 'bg-[#F4A78E]/30 text-[#C24D28]'
                          : req.priority === 'HIGH'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-[#EBF8F4] text-[#2A6E57] border border-[#A9DFCB]'
                      }`}>
                        {req.priority}
                      </span>
                    </div>

                    <div className="font-semibold text-[#102025] truncate">{req.customerName}</div>

                    <div className="flex items-center justify-between text-[11px] text-[#6B675E] pt-1.5 border-t border-[#DAD3C9]/60 font-medium">
                      <span>{req.region} &bull; {req.requiredSkill}</span>
                      <span className="font-mono">{req.windowStart}–{req.windowEnd} ({req.durationMinutes}m)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-2.5">
            {notifications.length === 0 ? (
              <p className="text-xs text-[#6B675E] italic p-2 font-medium">No notifications dispatched yet.</p>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className="p-3.5 rounded-xl bg-[#FBF8F1] border border-[#DAD3C9] flex items-start justify-between gap-3 text-xs shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#07171D] text-[#A9DFCB] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-[#102025] flex items-center gap-2">
                        <span>{n.title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-mono font-semibold">
                          {n.channel} &bull; {n.status}
                        </span>
                      </div>
                      <p className="text-[#6B675E] mt-1 font-medium">{n.messagePayload}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[#6B675E] shrink-0 font-medium">
                    {new Date(n.sentAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-2 text-xs font-mono">
            {auditLogs.map(log => (
              <div
                key={log.id}
                className="p-3 px-4 rounded-xl bg-[#FBF8F1] border border-[#DAD3C9] flex items-center justify-between gap-3 hover:bg-[#F2EDE3]/50 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#07171D] text-[#FFFDF8] font-bold">
                    {log.action}
                  </span>
                  <span className="text-[#102025] font-sans font-semibold">
                    {log.entityType} ({log.entityId})
                  </span>
                  <span className="text-[#6B675E] text-[11px] font-sans font-medium">
                    by <strong>{log.actor}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[#6B675E] text-[11px] truncate max-w-sm font-sans font-medium">
                    {JSON.stringify(log.changeDiff)}
                  </span>
                  <span className="text-[10px] text-[#6B675E] shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
