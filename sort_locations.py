import json
from collections import defaultdict

# 🔧 파일 설정
INPUT_FILE = "locations.json"
OUTPUT_FILE = "locations_by_type_district.json"

# 🔹 type 우선순위
type_priority = {
    "public": 0,
    "cafe": 1,
    "building": 2
}

# 🔹 자치구 약자
district_abbr = {
    "강남구": "gn", "강동구": "gd", "강북구": "kb", "강서구": "gs",
    "관악구": "ga", "광진구": "gj", "구로구": "gr", "금천구": "gc",
    "노원구": "nw", "도봉구": "db", "동대문구": "ddm", "동작구": "dj",
    "마포구": "mp", "서대문구": "sdm", "서초구": "sc", "성동구": "sd",
    "성북구": "sb", "송파구": "sp", "양천구": "yc", "영등포구": "ydp",
    "용산구": "ys", "은평구": "ep", "종로구": "jr", "중구": "jg", "중랑구": "jl"
}

# 🔹 자치구 추출
def extract_district(text):
    for word in text.split():
        if word.endswith("구"):
            return word
    return "기타"

# 🔹 파일 불러오기
with open(INPUT_FILE, "r", encoding="utf-8") as f:
    locations = json.load(f)

# 🔹 type별로 묶기
type_groups = defaultdict(list)
for loc in locations:
    loc_type = loc.get("type", "unknown")
    district = extract_district(loc.get("address", loc.get("title", "")))
    loc["district"] = district
    type_groups[loc_type].append(loc)

# 🔹 최종 리스트
final_list = []

# 🔹 type 순서대로 → 그 안에서 자치구 가나다순 → title 순 정렬 + ID 부여
for t in sorted(type_priority, key=lambda x: type_priority[x]):
    group = type_groups[t]
    group.sort(key=lambda loc: (
        extract_district(loc.get("address", loc.get("title", ""))),
        loc.get("title", "")
    ))

    counter = defaultdict(int)
    for loc in group:
        district = loc["district"]
        abbr = district_abbr.get(district, "xx")
        code = abbr + t[0]
        counter[code] += 1
        loc["id"] = f"{code}-{counter[code]}"
        final_list.append(loc)

# 🔹 저장
with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(final_list, f, ensure_ascii=False, indent=2)

print(f"✅ 유형 → 자치구 순 정렬 및 ID 부여 완료: {OUTPUT_FILE}")



