import React, { useState } from 'react';
import { Bell, History, Inbox, Flame } from 'lucide-react';
import { ServiceRequest, Notification, AuditLog, Assignment } from '../types';

interface AuditNotificationTabsProps {
  requests: ServiceRequest[];
  assignments: Assignment[];
  notifications: Notification[];
  auditLogs: AuditLog[];
}

export const AuditNotificationTabs: React.FC<AuditNotificationTabsProps> = ({
  requests,
  assignments,
  notifications,
  auditLogs,
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
            {unassignedRequests.length === 0 ? (
              <p className="text-xs text-[#6B675E] italic p-2 font-medium">All work orders are currently assigned.</p>
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
