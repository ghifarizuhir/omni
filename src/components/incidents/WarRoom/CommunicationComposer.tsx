import React, { useState, useEffect } from 'react';
import { Bell, Send } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Incident } from '@/src/types/incident';
import { differenceInMinutes } from 'date-fns';
import { cn } from '@/src/lib/utils';

interface CommunicationComposerProps {
  incident: Incident;
  lastCommsAt?: string;
  onPost: (comms: { audience: string; message: string; channels: string[] }) => void;
}

type Audience = 'all_staff' | 'internal' | 'customer';

const TEMPLATES: Record<string, Record<Audience, string>> = {
  Identifying: {
    all_staff: `We are aware of an issue affecting ${'{SERVICE}'}. Teams are currently investigating. We will provide an update in 15 minutes.`,
    internal: `Investigating elevated errors on ${'SERVICE'}. Cause unknown. Gathering metrics now.`,
    customer: `We are currently investigating an issue affecting some users. We will provide an update shortly.`,
  },
  Investigating: {
    all_staff: `Investigation update: we have identified the affected component and are narrowing down the root cause. ETA for resolution: {ETA_MIN} minutes.`,
    internal: `Root cause identified. Currently on path to resolution. ETA {ETA_MIN}m.`,
    customer: `We have identified the issue and are actively working to resolve it. Expected resolution in {ETA_MIN} minutes.`,
  },
  Mitigating: {
    all_staff: `Mitigation in progress. We have applied a fix and are monitoring for recovery. Some users may still see errors.`,
    internal: `Mitigation applied. Watching metrics for stabilisation.`,
    customer: `We have applied a fix and are monitoring recovery. Service should be restored shortly.`,
  },
  Resolved: {
    all_staff: `The incident has been resolved. Service has been restored to normal operation. We will publish a full post-incident review shortly.`,
    internal: `Incident resolved. PIR to follow.`,
    customer: `The issue has been resolved. All services are operating normally. Thank you for your patience.`,
  },
};

const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: 'all_staff', label: 'All staff' },
  { value: 'internal', label: 'IT only' },
  { value: 'customer', label: 'Customers (status page)' },
];

const CHANNEL_OPTIONS = ['Slack #incidents', 'Email all-staff', 'Customer status page'];

export const CommunicationComposer: React.FC<CommunicationComposerProps> = ({
  incident,
  lastCommsAt,
  onPost,
}) => {
  const [audience, setAudience] = useState<Audience>('all_staff');
  const [template, setTemplate] = useState('Identifying');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState<string[]>(['Slack #incidents', 'Email all-staff']);
  const [minutesSinceComms, setMinutesSinceComms] = useState(0);

  useEffect(() => {
    if (!lastCommsAt) return;
    const update = () => setMinutesSinceComms(differenceInMinutes(Date.now(), new Date(lastCommsAt)));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [lastCommsAt]);

  useEffect(() => {
    const tmpl = TEMPLATES[template]?.[audience] ?? '';
    const service = incident.affectedServiceIds[0] ?? 'affected service';
    setMessage(tmpl.replace(/{SERVICE}/g, service));
  }, [template, audience, incident.affectedServiceIds]);

  const toggleChannel = (ch: string) => {
    setChannels(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    );
  };

  const handlePost = () => {
    if (!message.trim()) return;
    onPost({ audience, message: message.trim(), channels });
    setMessage('');
  };

  const showReminder = !!lastCommsAt && minutesSinceComms >= 28;
  const noCommsYet = !lastCommsAt;

  return (
    <div className="flex flex-col border-t border-ois-border bg-ois-bg">
      {/* Reminder banner */}
      {(showReminder || noCommsYet) && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200">
          <Bell size={13} className="text-amber-600 shrink-0" />
          <p className="text-xs text-amber-800 font-medium">
            {noCommsYet
              ? 'No communications posted yet. Stakeholders need an update.'
              : `No comms posted in ${minutesSinceComms} minutes. Stakeholders expect updates every 30 min.`}
          </p>
        </div>
      )}

      <div className="px-4 py-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-ois-text uppercase tracking-widest">Compose update</p>
        </div>

        {/* Audience */}
        <div className="flex gap-3">
          {AUDIENCE_OPTIONS.map(opt => (
            <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="audience"
                value={opt.value}
                checked={audience === opt.value}
                onChange={() => setAudience(opt.value)}
                className="w-3.5 h-3.5 text-ois-primary focus:ring-ois-primary/30"
              />
              <span className="text-xs text-ois-text">{opt.label}</span>
            </label>
          ))}
        </div>

        {/* Template */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-ois-text-muted shrink-0">Template</span>
          <select
            value={template}
            onChange={e => setTemplate(e.target.value)}
            className="flex-1 border border-ois-border rounded-md px-2 py-1 text-xs text-ois-text bg-white focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary"
          >
            {Object.keys(TEMPLATES).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Message */}
        <textarea
          rows={3}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Type your update..."
          className="w-full border border-ois-border rounded-lg px-3 py-2 text-sm text-ois-text bg-white placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary transition-colors resize-none"
        />

        {/* Channels */}
        <div className="flex gap-3 flex-wrap">
          {CHANNEL_OPTIONS.map(ch => (
            <label key={ch} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={channels.includes(ch)}
                onChange={() => toggleChannel(ch)}
                className="w-3.5 h-3.5 rounded text-ois-primary focus:ring-ois-primary/30"
              />
              <span className="text-xs text-ois-text">{ch}</span>
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setMessage('')}>
            Clear
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handlePost}
            disabled={!message.trim() || channels.length === 0}
          >
            <Send size={13} className="mr-1.5" />
            Post
          </Button>
        </div>
      </div>
    </div>
  );
};
