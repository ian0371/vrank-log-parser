# Download VRank logs from DataDog

## Install dependencies

Requires

- Go 1.18+
- Python 3.9+

```
./setup.sh
```

## Download

For testing

```
./dl.py -s 2023-10-01 -e 2023-10-15 -t 8h    # 14 days, 8 hours interval
./dl.py -t 1m -n 1                           # 1 minute, once (for testing)
```
