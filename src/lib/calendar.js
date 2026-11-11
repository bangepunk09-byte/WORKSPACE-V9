import { getAccessToken } from './auth';

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export const listEvents = async (options = {}) => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token');

  const timeMin = options.timeMin || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(options.maxResults || 100),
    timeMin,
  });

  const response = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) throw new Error('Failed to fetch events');
  return response.json();
};

export const createEvent = async (event) => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token');

  const response = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) throw new Error('Failed to create event');
  return response.json();
};

export const deleteEvent = async (eventId) => {
  const token = await getAccessToken();
  if (!token) throw new Error('No access token');

  const cleanId = String(eventId || '').replace(/^gcal_/, '');
  const response = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events/${encodeURIComponent(cleanId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok && response.status !== 404 && response.status !== 410) {
    throw new Error('Failed to delete event from Google Calendar');
  }
  return true;
};

