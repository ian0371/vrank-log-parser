#!/usr/bin/env python
# Automated dd-download runner.

import argparse
import collections
import json
import os
import subprocess
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from os import path
from pytimeparse.timeparse import timeparse

load_dotenv()

config_template = '''
apiVersion: datadog/v1
kind: DataDog
spec:
  auth:
    dd_api_key: {DD_API_KEY}
    dd_app_key: {DD_APP_KEY}
    dd_site: datadoghq.com
  datadog_filter:
    from: {DD_FROM_MSEC}
    to: {DD_TO_MSEC}
    query: vrank
  mapping:
  - dd_field: seq
    field: blocknumber
  - dd_field: round
    field: round
  - dd_field: late
    field: late
  - dd_field: bitmap
    field: bitmap
'''

help_epilog = '''
examples:
    # Download 14 weeks data, 8 hours interval
    ./dl.py -s 2023-10-01 -e 2023-10-15 -t 8h

    # Download 1 minute once for test
    ./dl.py -t 1m -n 1
'''

Context = collections.namedtuple('Context',
     ['dd_path', 'config_path', 'output_dir', 'dd_api_key', 'dd_app_key', 'start', 'end', 'interval', 'max_count'])
Segment = collections.namedtuple('Segment', ['tag', 'start_msec', 'end_msec'])

def parse_args() -> Context:
    script_dir = path.dirname(__file__)
    default_bin_path = path.abspath(path.join(script_dir, "dd-downloader", "dd-downloader"))
    default_config_path = path.abspath(path.join(script_dir, "config.yml"))
    default_output_dir = path.abspath(path.join(script_dir, "output"))

    now = datetime.now()
    day = timedelta(days=1)
    default_start = (now - day).strftime('%Y-%m-%d')
    default_end = now.strftime('%Y-%m-%d')

    parser = argparse.ArgumentParser(
            prog='auto-dd-download',
            description='Automated DataDog log downloader based on dd-downloader',
            epilog=help_epilog,
            formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('-s', '--start', default=default_start, help='start time in ISO-8601 format')
    parser.add_argument('-e', '--end', default=default_end, help='end time in ISO-8601 format')
    parser.add_argument('-t', '--interval', default='8h', help='interval length')
    parser.add_argument('-n', '--count', default='100', type=int, help='maximum number of segments, 0 for unlimited')
    parser.add_argument('-c', '--config', default=default_config_path, help='Path to write temporary config.yaml')
    parser.add_argument('-o', '--output', default=default_output_dir, help='CSV output directory')
    args = parser.parse_args()

    ctx = Context(
        dd_path     = default_bin_path,
        config_path = args.config,
        output_dir  = args.output,
        dd_api_key  = os.getenv("DD_API_KEY"),
        dd_app_key  = os.getenv("DD_APP_KEY"),
        start       = datetime.fromisoformat(args.start),
        end         = datetime.fromisoformat(args.end),
        interval    = timeparse(args.interval),
        max_count   = args.count,
    )

    if not ctx.interval:
        raise Exception("Invalid time interval '{}'".format(args.interval))
    assert ctx.start < ctx.end
    assert ctx.interval >= 60 # at least 1 minute
    assert ctx.interval <= 24*60*60 # less than 1 day

    return ctx

def chop_segments(ctx: Context) -> list[Segment]:
    segs: list[Segment] = []

    end = ctx.end
    delta = timedelta(seconds=ctx.interval)
    count = ctx.max_count

    unlimited = (ctx.max_count == 0)
    seg_start = ctx.start

    while (unlimited or count > 0) and (seg_start < end):
        if (seg_start + delta) <= end:
            seg_end = seg_start + delta
        else:
            seg_end = end

        seg = Segment(
            tag = seg_start.strftime("%Y%m%d_%H%M%S"),
            start_msec = int(seg_start.timestamp()) * 1000,
            end_msec = int(seg_end.timestamp()) * 1000,
        )
        segs.append(seg)

        seg_start += delta
        count -= 1

    return segs

def dl_segment(ctx: Context, seg: Segment):
    config = config_template.format(
            DD_API_KEY=ctx.dd_api_key,
            DD_APP_KEY=ctx.dd_app_key,
            DD_FROM_MSEC=seg.start_msec,
            DD_TO_MSEC=seg.end_msec)
    with open(ctx.config_path, 'w') as f:
        f.write(config)

    print("[+] Fetching {}".format(seg.tag))
    config_path = path.relpath(ctx.config_path, os.curdir)
    output_path = path.join(ctx.output_dir, "vrank_logs_{}.csv".format(seg.tag))
    subprocess.run([ctx.dd_path, 'run', 'parallel', '-c', config_path, '-f', output_path])

if __name__ == '__main__':
    ctx = parse_args()
    print(json.dumps(ctx._asdict(), indent=2, default=str))

    segs = chop_segments(ctx)
    print("[+] Chopped {} segments".format(len(segs)))

    os.makedirs(ctx.output_dir, exist_ok=True)
    print("[+] Downloading to '{}'".format(ctx.output_dir))

    for seg in segs:
        dl_segment(ctx, seg)
    print("[+] Download complete")
