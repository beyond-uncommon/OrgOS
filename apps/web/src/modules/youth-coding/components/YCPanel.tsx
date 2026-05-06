import { Box, Typography, Divider } from "@mui/material";

interface SchoolBreakdownEntry {
  school: string;
  count: number;
}

interface YCPanelProps {
  uniqueStudents: number;
  sessionCount: number;
  completionRate?: number;
  schoolBreakdown?: SchoolBreakdownEntry[];
  genderBreakdown?: { gender: string; count: number }[];
  schoolCount?: number;
  label?: string;
}

export function YCPanel({
  uniqueStudents,
  sessionCount,
  completionRate,
  schoolBreakdown,
  genderBreakdown,
  schoolCount,
  label = "Youth Coding",
}: YCPanelProps) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        p: 3,
        mb: 3,
      }}
    >
      <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>
        {label}
      </Typography>

      <Box sx={{ display: "flex", gap: 4, mt: 1, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {uniqueStudents}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Students Taught
          </Typography>
        </Box>

        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {sessionCount}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Sessions This Month
          </Typography>
        </Box>

        {completionRate !== undefined && (
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {completionRate}%
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Completion Rate
            </Typography>
          </Box>
        )}

        {schoolCount !== undefined && (
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {schoolCount}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Schools
            </Typography>
          </Box>
        )}
      </Box>

      {genderBreakdown && genderBreakdown.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "flex", gap: 3 }}>
            {genderBreakdown.map(g => (
              <Box key={g.gender}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {g.count}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {g.gender === "M" ? "Male" : g.gender === "F" ? "Female" : "Other"}
                </Typography>
              </Box>
            ))}
          </Box>
        </>
      )}

      {schoolBreakdown && schoolBreakdown.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1 }}>
            By School
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {schoolBreakdown.map(s => (
              <Box
                key={s.school}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  bgcolor: "action.hover",
                  borderRadius: 1,
                  fontSize: "0.75rem",
                }}
              >
                {s.school}: {s.count}
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
