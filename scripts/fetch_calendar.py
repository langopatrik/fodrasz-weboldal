#!/usr/bin/env python3
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = ROOT / 'calendar-data.json'
CALENDAR_URL = 'https://calendar.google.com/calendar/ical/damrsmurf4@gmail.com/public/basic.ics'


def parse_ics_date(raw_value: str):
    value = (raw_value or '').strip()
    if not value:
        return None

    if re.fullmatch(r'\d{8}', value):
        try:
            return datetime.strptime(value, '%Y%m%d').replace(tzinfo=timezone.utc)
        except ValueError:
            return None

    match = re.fullmatch(r'(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?', value)
    if not match:
        return None

    year, month, day, hour, minute, second, is_utc = match.groups()
    dt = datetime(
        int(year), int(month), int(day),
        int(hour), int(minute), int(second),
        tzinfo=timezone.utc if is_utc == 'Z' else timezone.utc,
    )
    return dt


def isoformat_z(value):
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


def main():
    req = Request(CALENDAR_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urlopen(req, timeout=30) as response:
        ics_text = response.read().decode('utf-8', errors='replace')

    events = []
    for block in ics_text.split('BEGIN:VEVENT')[1:]:
        start_match = re.search(r'DTSTART(?:;[^:\n]+)?:(.+)', block, flags=re.IGNORECASE | re.MULTILINE)
        end_match = re.search(r'DTEND(?:;[^:\n]+)?:(.+)', block, flags=re.IGNORECASE | re.MULTILINE)
        summary_match = re.search(r'SUMMARY:(.+)', block, flags=re.IGNORECASE | re.MULTILINE)

        if not start_match or not end_match:
            continue

        start = parse_ics_date(start_match.group(1).strip())
        end = parse_ics_date(end_match.group(1).strip())
        if start is None or end is None or end <= start:
            continue

        title = summary_match.group(1).strip() if summary_match else 'Foglalt időpont'
        events.append({
            'title': title,
            'start': isoformat_z(start),
            'end': isoformat_z(end),
        })

    OUTPUT_PATH.write_text(json.dumps(events, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Wrote {len(events)} calendar events to {OUTPUT_PATH}')


if __name__ == '__main__':
    main()
