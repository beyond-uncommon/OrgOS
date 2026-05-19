"use client";

import * as React from "react";
import {
  Box, Container, Typography, Chip, Button, Divider, Avatar,
  Paper, IconButton
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import SchoolIcon from "@mui/icons-material/School";
import GroupsIcon from "@mui/icons-material/Groups";
import HandshakeIcon from "@mui/icons-material/Handshake";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { PDFReportButton } from "@/modules/report-export/PDFReportButton";
import { StoriesGrid } from "@/modules/stories/StoriesGrid";

function fmt(n: number): string { return n.toLocaleString("en-US"); }

function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <Box sx={{ textAlign: "center", px: 2 }}>
      <Typography sx={{ fontSize: { xs: "2rem", md: "2.75rem" }, fontWeight: 800, letterSpacing: "-0.03em", color: "white", lineHeight: 1.1 }}>
        {value}
      </Typography>
      <Typography sx={{ fontSize: "0.85rem", fontWeight: 500, color: "rgba(255,255,255,0.75)" }}>
        {label}
      </Typography>
    </Box>
  );
}

function ProgramCard({ name, studentCount, completionRate, hubCount, impact }: {
  name: string; studentCount: number; completionRate: number; hubCount: number; impact: string;
}) {
  return (
    <Box sx={{
      bgcolor: "white", borderRadius: 3, p: 3.5, border: "1px solid #E5E7EB",
      transition: "transform 0.15s, box-shadow 0.15s",
      "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 25px rgba(0,0,0,0.08)" },
    }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <Avatar sx={{ bgcolor: "#04785715", color: "#047857", width: 36, height: 36, fontSize: "1rem" }}>
          {name[0]}
        </Avatar>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.05rem" }}>{name}</Typography>
      </Box>
      <Typography variant="body2" sx={{ color: "#6B7280", mb: 2.5, lineHeight: 1.6, fontSize: "0.85rem" }}>
        {impact}
      </Typography>
      <Box sx={{ display: "flex", gap: 3 }}>
        <Box><Typography variant="h5" sx={{ fontWeight: 700, color: "#047857" }}>{fmt(studentCount)}</Typography>
        <Typography variant="caption" sx={{ color: "#9CA3AF" }}>Students</Typography></Box>
        <Box><Typography variant="h5" sx={{ fontWeight: 700, color: "#2563EB" }}>{completionRate}%</Typography>
        <Typography variant="caption" sx={{ color: "#9CA3AF" }}>Completion</Typography></Box>
        <Box><Typography variant="h5" sx={{ fontWeight: 700, color: "#6B7280" }}>{hubCount}</Typography>
        <Typography variant="caption" sx={{ color: "#9CA3AF" }}>Hubs</Typography></Box>
      </Box>
    </Box>
  );
}

function QuoteCard({ quote, student, rating }: { quote: string; student: string; rating: number }) {
  return (
    <Box sx={{
      bgcolor: "white", borderRadius: 2, p: 2.5, border: "1px solid #E5E7EB",
      transition: "border-color 0.15s",
      "&:hover": { borderColor: "#04785740" },
    }}>
      <Typography variant="body2" sx={{ fontStyle: "italic", color: "#4B5563", mb: 1.5, lineHeight: 1.7, fontSize: "0.85rem" }}>
        &ldquo;{quote.length > 120 ? quote.slice(0, 120) + "…" : quote}&rdquo;
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: "#111827" }}>{student}</Typography>
        <Box sx={{ display: "flex", gap: 0.3 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: i < rating ? "#047857" : "#E5E7EB" }} />
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function FundingBar({ name, amount, percentage, color }: { name: string; amount: number; percentage: number; color: string }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: "#374151" }}>{name}</Typography>
        <Typography variant="caption" sx={{ color: "#6B7280" }}>{percentage}%</Typography>
      </Box>
      <Box sx={{ height: 8, borderRadius: 4, bgcolor: "#F3F4F6", overflow: "hidden" }}>
        <Box sx={{ height: "100%", borderRadius: 4, bgcolor: color, width: `${percentage}%`, transition: "width 0.5s" }} />
      </Box>
      <Typography variant="caption" sx={{ color: "#9CA3AF" }}>${amount.toLocaleString()}</Typography>
    </Box>
  );
}

interface Props {
  overview: { totalStudents: number; totalPrograms: number; totalHubs: number; totalFunding: number };
  programs: Array<{ id: string; name: string; studentCount: number; completionRate: number; hubCount: number; impact: string }>;
  stories: Array<{ id: string; title: string; excerpt: string; heroImage?: string | null; authorName: string; createdAt: Date }>;
  quotes: Array<{ quote: string; student: string; rating: number }>;
  funding: { byProgram: Array<{ name: string; amount: number; percentage: number }>; total: number };
  photos: Array<{ id: string; url: string; caption: string; eventName: string }>;
}

export function PortalClient({ overview, programs, stories, quotes, funding, photos }: Props) {
  const fundingColors = ["#047857", "#2563EB", "#D97706", "#7C3AED", "#DC2626"];

  return (
    <Box sx={{ bgcolor: "#F9FAFB", minHeight: "100vh", fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      {/* Nav */}
      <Box sx={{ bgcolor: "white", borderBottom: "1px solid #E5E7EB" }}>
        <Container maxWidth="lg" sx={{ py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: "-0.01em" }}>
            Org<Box component="span" sx={{ color: "#047857" }}>OS</Box>
            <Box component="span" sx={{ ml: 1, fontSize: "0.75rem", color: "#6B7280", fontWeight: 400 }}>Partner Portal</Box>
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="outlined" size="small" href="mailto:partnerships@uncommon.org" sx={{ textTransform: "none", fontSize: "0.8rem", borderRadius: 2 }}>
              Contact Us
            </Button>
            <Button variant="contained" size="small" href="/api/auth/signout" sx={{ textTransform: "none", fontSize: "0.8rem", borderRadius: 2, bgcolor: "#111827", "&:hover": { bgcolor: "#374151" } }}>
              Sign Out
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Hero */}
      <Box sx={{ bgcolor: "#111827", py: { xs: 5, md: 7 } }}>
        <Container maxWidth="lg">
          <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#047857", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1 }}>
            Impact Dashboard · {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, letterSpacing: "-0.03em", color: "white", mb: 2, fontSize: { xs: "2rem", md: "2.75rem" } }}>
            Real Results from Real Investment
          </Typography>
          <Typography sx={{ color: "#9CA3AF", mb: 5, maxWidth: 600, lineHeight: 1.7, fontSize: "0.95rem" }}>
            Your support powers technology education across Africa. See the live impact — updated hourly, no manual reports needed.
          </Typography>

          <Box sx={{ display: "flex", gap: { xs: 3, md: 6 }, flexWrap: "wrap", justifyContent: { xs: "center", md: "flex-start" } }}>
            <HeroMetric value={fmt(overview.totalStudents)} label="Students Reached" />
            <HeroMetric value={fmt(overview.totalPrograms)} label="Programs" />
            <HeroMetric value={fmt(overview.totalHubs)} label="Active Hubs" />
            <HeroMetric value={`$${Math.round(overview.totalFunding / 1000)}K`} label="Total Funding" />
          </Box>
        </Container>
      </Box>

      {/* Mission Statement */}
      <Box sx={{ py: 4, borderBottom: "1px solid #E5E7EB", bgcolor: "white" }}>
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "center" }}>
            <SchoolIcon sx={{ color: "#047857", fontSize: 24 }} />
            <Typography sx={{ color: "#4B5563", fontSize: "0.9rem", textAlign: "center", maxWidth: 700 }}>
              <strong>OrgOS</strong> is an open-source operational intelligence platform built for nonprofits. Every metric here is generated automatically from daily staff inputs.
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 5 }}>

        {/* Programs Section */}
        <Typography variant="overline" sx={{ color: "#047857", fontWeight: 700, letterSpacing: "0.08em", display: "block", mb: 1 }}>
          Our Programs
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: "-0.02em", mb: 3 }}>
          How Your Support Creates Change
        </Typography>
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {programs.map(p => (
            <Grid key={p.id} size={{ xs: 12, sm: 6, lg: 3 }}>
              <ProgramCard {...p} />
            </Grid>
          ))}
        </Grid>

        {/* Student Voice */}
        {quotes.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
              <FavoriteBorderIcon sx={{ color: "#DC2626", fontSize: 20 }} />
              <Typography variant="overline" sx={{ color: "#DC2626", fontWeight: 700, letterSpacing: "0.08em" }}>
                Student Voice
              </Typography>
            </Box>
            <Grid container spacing={2}>
              {quotes.map((q, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                  <QuoteCard {...q} />
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Funding Transparency */}
        <Box sx={{ mb: 6 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <AccountBalanceIcon sx={{ color: "#047857", fontSize: 20 }} />
            <Typography variant="overline" sx={{ color: "#047857", fontWeight: 700, letterSpacing: "0.08em" }}>
              Funding Transparency
            </Typography>
          </Box>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ bgcolor: "white", borderRadius: 3, p: 3.5, border: "1px solid #E5E7EB", textAlign: "center", height: "100%" }}>
                <Typography variant="h3" sx={{ fontWeight: 800, color: "#047857", letterSpacing: "-0.03em" }}>
                  ${(funding.total / 1000).toFixed(0)}K
                </Typography>
                <Typography variant="body2" sx={{ color: "#6B7280" }}>Total Funding Deployed</Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" sx={{ color: "#9CA3AF", lineHeight: 1.6, display: "block" }}>
                  Every dollar is tracked per program. Real-time transparency on how funds are allocated across initiatives.
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <Box sx={{ bgcolor: "white", borderRadius: 3, p: 3.5, border: "1px solid #E5E7EB", height: "100%" }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>Allocation by Program</Typography>
                {funding.byProgram.map((f, i) => (
                  <FundingBar key={f.name} name={f.name} amount={f.amount} percentage={f.percentage} color={fundingColors[i % fundingColors.length]!} />
                ))}
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Impact Stories */}
        {stories.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
              <GroupsIcon sx={{ color: "#2563EB", fontSize: 20 }} />
              <Typography variant="overline" sx={{ color: "#2563EB", fontWeight: 700, letterSpacing: "0.08em" }}>
                Impact Stories
              </Typography>
            </Box>
            <StoriesGrid
              stories={stories.map(s => ({
                id: s.id,
                title: s.title,
                excerpt: s.excerpt ?? null,
                authorName: s.authorName,
                authorRole: "",
                heroImage: s.heroImage ?? null,
                tags: [],
                featured: false,
                viewCount: 0,
                createdAt: new Date(s.createdAt),
              }))}
            />
          </Box>
        )}

        {/* Photo Gallery */}
        {photos.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
              <HandshakeIcon sx={{ color: "#D97706", fontSize: 20 }} />
              <Typography variant="overline" sx={{ color: "#D97706", fontWeight: 700, letterSpacing: "0.08em" }}>
                Moments & Events
              </Typography>
            </Box>
            <Grid container spacing={2}>
              {photos.slice(0, 4).map(p => (
                <Grid key={p.id} size={{ xs: 6, md: 3 }}>
                  <Box sx={{
                    borderRadius: 2, overflow: "hidden", border: "1px solid #E5E7EB",
                    bgcolor: "white", transition: "transform 0.15s",
                    "&:hover": { transform: "scale(1.02)" },
                  }}>
                    <Box component="img" src={p.url} alt={p.caption}
                      sx={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} />
                    <Box sx={{ p: 1.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: "#111827", display: "block" }}>
                        {p.eventName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#6B7280", fontSize: "0.65rem" }}>
                        {p.caption.slice(0, 60)}{p.caption.length > 60 ? "…" : ""}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Report Download */}
        <Box sx={{ mb: 6, bgcolor: "white", borderRadius: 3, p: 3.5, border: "1px solid #E5E7EB", textAlign: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Download Full Report</Typography>
          <Typography variant="body2" sx={{ color: "#6B7280", mb: 2.5, maxWidth: 450, mx: "auto" }}>
            Get a comprehensive PDF summary of all programs, outcomes, and financials.
          </Typography>
          <PDFReportButton
            title="Uncommon.org Impact Report"
            overview={overview}
            programs={programs.map(p => ({ name: p.name, students: p.studentCount, funding: 0 }))}
          />
        </Box>

        {/* CTA */}
        <Box sx={{ mb: 6, textAlign: "center" }}>
          <Divider sx={{ mb: 4 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Become a Partner</Typography>
          <Typography variant="body2" sx={{ color: "#6B7280", mb: 3, maxWidth: 450, mx: "auto" }}>
            Join us in building Africa&apos;s next generation of technologists. Your partnership makes this possible.
          </Typography>
          <Button variant="contained" size="large" endIcon={<ArrowForwardIcon />}
            href="mailto:partnerships@uncommon.org"
            sx={{ textTransform: "none", bgcolor: "#047857", "&:hover": { bgcolor: "#065F46" }, borderRadius: 2, px: 4 }}>
            Get in Touch
          </Button>
        </Box>

        {/* Footer */}
        <Divider sx={{ mb: 3 }} />
        <Box sx={{ textAlign: "center", pb: 4 }}>
          <Typography variant="caption" sx={{ color: "#9CA3AF" }}>
            Powered by <strong>OrgOS</strong> · Uncommon.org · Data updates hourly · {new Date().getFullYear()}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}