export type MatchDetail = {
  placement: number
  score: number
  placementScore: number
  eliminationScore: number
  eliminations: number
}

export type TeamResult = {
  placement: number
  teamName: string
  playerName: string
  members: string[]
  totalScore: number
  placementScore: number
  eliminationScore: number
  countVR: number
  eliminations: number
  avgAliminations: number
  avgPlacement: number
  numOfMatches: number
  detailScores: MatchDetail[]
}

export type TournamentResults = TeamResult[]

type TeamKey = string

type CumulativeTotals = {
  matchesPlayed: number
  totalScore: number
  placementScore: number
  eliminationScore: number
  eliminations: number
  avgPlacement: number
  avgEliminations: number
}

export type CumulativeStandingEntry = {
  teamKey: TeamKey
  placement: number
  rankChange: number
  totals: CumulativeTotals
  team: TeamResult
}

export type MatchPlacementEntry = {
  teamKey: TeamKey
  matchIndex: number
  rank: number
  detail: MatchDetail
  team: TeamResult
}

export type StandingsTimeline = CumulativeStandingEntry[][]
export type MatchPlacementsTimeline = MatchPlacementEntry[][]
export type MatchRankingSnapshots = {
  overallStandings: Array<CumulativeStandingEntry[] | null>
  matchPlacements: Array<MatchPlacementEntry[] | null>
}

const getTeamKey = (team: TeamResult): TeamKey =>
  `${team.teamName}::${team.playerName}`

const sumBy = <T>(items: T[], selector: (item: T) => number) =>
  items.reduce((acc, item) => acc + selector(item), 0)

const getMatchCount = (results: TournamentResults): number => {
  if (results.length === 0) return 0

  return results.reduce(
    (maxCount, team) => Math.max(maxCount, team.detailScores.length),
    0,
  )
}

const computeCumulativeTotals = (
  team: TeamResult,
  matchIndex: number,
): CumulativeTotals => {
  const upperBound = Math.min(team.detailScores.length, matchIndex + 1)
  const relevantMatches = team.detailScores.slice(0, upperBound)

  if (relevantMatches.length === 0) {
    return {
      matchesPlayed: 0,
      totalScore: 0,
      placementScore: 0,
      eliminationScore: 0,
      eliminations: 0,
      avgPlacement: 0,
      avgEliminations: 0,
    }
  }

  const totalScore = sumBy(relevantMatches, (match) => match.score)
  const placementScore = sumBy(
    relevantMatches,
    (match) => match.placementScore,
  )
  const eliminationScore = sumBy(
    relevantMatches,
    (match) => match.eliminationScore,
  )
  const eliminations = sumBy(relevantMatches, (match) => match.eliminations)
  const totalPlacement = sumBy(relevantMatches, (match) => match.placement)

  return {
    matchesPlayed: relevantMatches.length,
    totalScore,
    placementScore,
    eliminationScore,
    eliminations,
    avgPlacement: totalPlacement / relevantMatches.length,
    avgEliminations: eliminations / relevantMatches.length,
  }
}

const compareTeamsByCumulativeTotals = (
  a: CumulativeStandingEntry,
  b: CumulativeStandingEntry,
) => {
  if (b.totals.totalScore !== a.totals.totalScore) {
    return b.totals.totalScore - a.totals.totalScore
  }

  if (b.totals.eliminationScore !== a.totals.eliminationScore) {
    return b.totals.eliminationScore - a.totals.eliminationScore
  }

  if (a.team.placement !== b.team.placement) {
    return a.team.placement - b.team.placement
  }

  return a.team.teamName.localeCompare(b.team.teamName)
}

const compareTeamsByMatchDetail = (a: MatchPlacementEntry, b: MatchPlacementEntry) => {
  if (b.detail.score !== a.detail.score) {
    return b.detail.score - a.detail.score
  }

  if (b.detail.eliminationScore !== a.detail.eliminationScore) {
    return b.detail.eliminationScore - a.detail.eliminationScore
  }

  if (a.detail.placement !== b.detail.placement) {
    return a.detail.placement - b.detail.placement
  }

  return a.team.teamName.localeCompare(b.team.teamName)
}

export const buildCumulativeStandingsTimeline = (
  scoreJson: TournamentResults,
): StandingsTimeline => {
  const totalMatches = getMatchCount(scoreJson)
  if (totalMatches === 0) return []

  const timelines: StandingsTimeline = []
  let previousPlacementMap = new Map<TeamKey, number>()

  for (let matchIndex = 0; matchIndex < totalMatches; matchIndex++) {
    const standingEntries: CumulativeStandingEntry[] = scoreJson.map((team) => {
      const totals = computeCumulativeTotals(team, matchIndex)
      return {
        teamKey: getTeamKey(team),
        placement: 0,
        rankChange: 0,
        totals,
        team,
      }
    })

    standingEntries.sort(compareTeamsByCumulativeTotals)

    const nextPlacementMap = new Map<TeamKey, number>()

    standingEntries.forEach((entry, index) => {
      const currentPlacement = index + 1
      const previousPlacement = previousPlacementMap.get(entry.teamKey)
      const rankChange =
        previousPlacement !== undefined
          ? previousPlacement - currentPlacement
          : 0

      entry.placement = currentPlacement
      entry.rankChange = matchIndex === 0 ? 0 : rankChange
      nextPlacementMap.set(entry.teamKey, currentPlacement)
    })

    timelines.push(standingEntries)
    previousPlacementMap = nextPlacementMap
  }

  return timelines
}

export const buildMatchPlacementsTimeline = (
  scoreJson: TournamentResults,
): MatchPlacementsTimeline => {
  const totalMatches = getMatchCount(scoreJson)
  if (totalMatches === 0) return []

  const timelines: MatchPlacementsTimeline = []

  for (let matchIndex = 0; matchIndex < totalMatches; matchIndex++) {
    const placementEntries: MatchPlacementEntry[] = scoreJson
      .map((team) => {
        const detail = team.detailScores[matchIndex]
        if (!detail) return null

        return {
          teamKey: getTeamKey(team),
          matchIndex,
          rank: 0,
          detail,
          team,
        }
      })
      .filter((entry): entry is MatchPlacementEntry => entry !== null)

    placementEntries.sort(compareTeamsByMatchDetail)

    placementEntries.forEach((entry, index) => {
      entry.rank = index + 1
    })

    timelines.push(placementEntries)
  }

  return timelines
}

export const buildMatchRankingSnapshots = (
  scoreJson: TournamentResults,
  matchIndex: number,
): MatchRankingSnapshots => {
  const overallTimeline = buildCumulativeStandingsTimeline(scoreJson)
  const matchTimeline = buildMatchPlacementsTimeline(scoreJson)

  const getEntry = <T>(timeline: T[][], index: number): T[] | null =>
    index >= 0 && index < timeline.length ? timeline[index] : null

  return {
    overallStandings: [
      getEntry(overallTimeline, matchIndex),
      getEntry(overallTimeline, matchIndex + 1),
    ],
    matchPlacements: [
      getEntry(matchTimeline, matchIndex),
      getEntry(matchTimeline, matchIndex + 1),
    ],
  }
}
