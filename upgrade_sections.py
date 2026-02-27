import re

file_path = "frontend/app/admin/analytics/page.tsx"
with open(file_path, 'r') as f:
    content = f.read()

# Replace the giant section container class strings
old_section_class = r'className="relative group bg-white dark:bg-\[\#111827\] rounded-3xl border border-slate-200 dark:border-white/\[0\.08\] shadow-xl shadow-slate-200/50 dark:shadow-black/40 overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 duration-500"'
new_section_class = 'className="relative group bg-white dark:bg-[#0B1121] rounded-[24px] border border-slate-200 dark:border-white/[0.06] shadow-md dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500 hover:shadow-2xl dark:hover:border-white/[0.12]"'
content = re.sub(old_section_class, new_section_class, content)

# There is one for feedback that lacks the hover translate
old_feedback_class = r'className="bg-white dark:bg-\[\#111827\] rounded-3xl border border-slate-200 dark:border-white/\[0\.08\] shadow-xl overflow-hidden relative group mt-8"'
new_feedback_class = 'className="relative group bg-white dark:bg-[#0B1121] rounded-[24px] border border-slate-200 dark:border-white/[0.06] shadow-md dark:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-500 hover:shadow-2xl dark:hover:border-white/[0.12] mt-8"'
content = re.sub(old_feedback_class, new_feedback_class, content)

# Replace the section header padded areas
old_header_class = r'className="p-8 border-b border-slate-100 dark:border-white/\[0\.08\] ([^"]*)"'
new_header_class = r'className="px-8 py-6 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01] \1"'
content = re.sub(old_header_class, new_header_class, content)

# Reduce the height of the section icons inside headers
old_icon_bg = r'className="w-12 h-12 bg-\[\#0B1121\] rounded-2xl flex items-center justify-center shadow-lg border ([^"]*)"'
new_icon_bg = r'className="w-12 h-12 bg-white dark:bg-[#111827] rounded-[16px] flex items-center justify-center shadow-sm border \1"'
content = re.sub(old_icon_bg, new_icon_bg, content)

with open(file_path, 'w') as f:
    f.write(content)

print("Replacement done.")
