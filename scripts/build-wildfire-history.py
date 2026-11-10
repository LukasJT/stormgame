"""Convert the GFED5 v5.0 BA.zip archive to the game's 2001–2020 ignition grid."""

import argparse
import base64
import io
import itertools
import json
import zipfile
from pathlib import Path

import h5py
import numpy as np


def build_history(archive_path):
    years_with_fire = np.zeros((720, 1440), dtype=np.uint8)
    with zipfile.ZipFile(archive_path) as archive:
        for year in range(2001, 2021):
            annual_area = np.zeros_like(years_with_fire, dtype=np.float64)
            for month in range(1, 13):
                with h5py.File(io.BytesIO(archive.read(f"BA{year}{month:02d}.nc"))) as data:
                    # Keep normal vegetation and peat burning. Exclude separately classified
                    # crop and deforestation fires. NetCDF latitudes run south to north.
                    total, crop, deforestation = (
                        np.nan_to_num(data[name][0], nan=0.0) for name in ("Total", "Crop", "Defo")
                    )
                    annual_area += np.maximum(0, total - crop - deforestation)[::-1]
            # Ignore residual rounding and detections smaller than one hectare in a year.
            years_with_fire += annual_area >= 0.01

    tiers = np.digitize(years_with_fire, [1, 3, 7, 13]).astype(np.uint8)
    packed = bytearray()
    for tier, cells in itertools.groupby(tiers.flat):
        count = sum(1 for _ in cells)
        while count:
            length = min(count, 32)
            packed.append((int(tier) << 5) | (length - 1))
            count -= length
    return base64.b64encode(packed).decode("ascii")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.write_text(json.dumps({"grid": build_history(args.archive)}) + "\n")
