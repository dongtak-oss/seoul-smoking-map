import json

# 🔧 파일 경로 설정
INPUT_FILE = "locations.json"
OUTPUT_FILE = "locations_sorted.json"

type_priority = {
    "public": 0,
    "cafe": 1,
    "building": 2
}

def extract_district(text):
    for word in text.split():
        if word.endswith("구"):
            return word
    return "기타"

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    locations = json.load(f)

locations.sort(key=lambda loc: (
    extract_district(loc.get("address", loc.get("title", ""))),
    type_priority.get(loc.get("type", ""), 99),
    loc.get("title", "")
))

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(locations, f, ensure_ascii=False, indent=2)

print(f"✅ 정렬 완료: {OUTPUT_FILE}")



import json
from collections import defaultdict

# 🔧 파일 경로 설정
INPUT_FILE = "locations.json"
OUTPUT_FILE = "locations_sorted_with_id.json"

# 🔹 type 우선순위
type_priority = {
    "public": 0,
    "cafe": 1,
    "building": 2
}

# 🔹 자치구 약자 매핑
district_abbr = {
    "강남구": "gn", "강동구": "gd", "강북구": "kb", "강서구": "gs",
    "관악구": "ga", "광진구": "gj", "구로구": "gr", "금천구": "gc",
    "노원구": "nw", "도봉구": "db", "동대문구": "dd", "동작구": "dj",
    "마포구": "mp", "서대문구": "sd", "서초구": "sc", "성동구": "sdg",
    "성북구": "sb", "송파구": "sp", "양천구": "yc", "영등포구": "yd",
    "용산구": "ys", "은평구": "ep", "종로구": "jr", "중구": "jg", "중랑구": "jl"
}

# 🔹 자치구명 추출 (주소에서)
def extract_district(text):
    for word in text.split():
        if word.endswith("구"):
            return word
    return "기타"

# 🔹 파일 로드
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    locations = json.load(f)

# 🔹 정렬
locations.sort(key=lambda loc: (
    extract_district(loc.get("address", loc.get("title", ""))),
    type_priority.get(loc.get("type", ""), 99),
    loc.get("title", "")
))

# 🔹 그룹별로 묶고 ID 부여
groups = defaultdict(list)
for loc in locations:
    title = loc.get("title", "")
    type_ = loc.get("type", "unknown")
    district = extract_district(loc.get("address", title))
    district_code = district_abbr.get(district, "xx")
    type_code = type_[0].lower() if type_ else "x"
    key = f"{district_code}{type_code}"
    groups[key].append(loc)

# 🔹 그룹별 정렬 후 ID 부여
for key, items in groups.items():
    items.sort(key=lambda x: x.get("title", ""))
    for i, loc in enumerate(items, start=1):
        loc["id"] = f"{key}-{i}"

# 🔹 저장
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(locations, f, ensure_ascii=False, indent=2)

print(f"✅ 정렬 및 ID 부여 완료: {OUTPUT_FILE}")

