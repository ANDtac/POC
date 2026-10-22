import { sequelize } from "../models/sequelize.js";
import { Run, RUN_STATUSES } from "../models/run.model.js";
import { Caught } from "../models/caught.model.js";
import { User } from "../models/user.model.js";
import { getGuide, guideIndex, progressOf } from "../guides/catalog.js";

const TITLE_MAX = 60;

const serializeRun = (run, caughtIds, extra = {}) => {
  const guide = getGuide(run.game_id);
  return {
    id: run.id,
    game_id: run.game_id,
    game_name: guide?.name ?? run.game_id,
    version: run.version,
    title: run.title,
    current_section: run.current_section,
    choices: run.choices ?? {},
    status: run.status,
    is_public: run.is_public,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    progress: guide ? progressOf(guide, run.choices ?? {}, caughtIds) : { caught: caughtIds.length, total: 0 },
    ...extra,
  };
};

const caughtIdsOf = async (runId) =>
  (await Caught.findAll({ where: { run_id: runId }, attributes: ["pokemon_id"], order: [["pokemon_id", "ASC"]] }))
    .map((c) => c.pokemon_id);

// Middleware: loads req.run. Owners always pass; others only when the run is public and the route allows it.
export const loadRun = ({ allowPublic = false } = {}) => async (req, res, next) => {
  const run = await Run.findByPk(req.params.id);
  const isOwner = Boolean(run && req.user && run.user_id === req.user.id);
  if (!run || !(isOwner || (allowPublic && run.is_public))) {
    return res.status(404).json({ error: "Run not found" });
  }
  req.run = run;
  req.isOwner = isOwner;
  next();
};

// GET runs of the connected user
export const listRuns = async (req, res) => {
  const runs = await Run.findAll({
    where: { user_id: req.user.id },
    include: [{ model: Caught, attributes: ["pokemon_id"] }],
    order: [["updatedAt", "DESC"]],
  });
  res.json(runs.map((run) => serializeRun(run, run.Caughts.map((c) => c.pokemon_id))));
};

// POST start a run
export const createRun = async (req, res) => {
  const { game_id, version, title } = req.body ?? {};
  const guide = getGuide(game_id);
  if (!guide) return res.status(400).json({ error: "Unknown game" });
  const versionInfo = guide.versions.find((v) => v.id === version)
    ?? (version === undefined && guide.versions.length === 1 ? guide.versions[0] : null);
  if (!versionInfo) return res.status(400).json({ error: `Version must be one of: ${guide.versions.map((v) => v.id).join(", ")}` });
  const name = (title ?? "").trim() || (guide.versions.length > 1 ? `${guide.name}: ${versionInfo.name}` : guide.name);
  if (name.length > TITLE_MAX) return res.status(400).json({ error: `Title must be at most ${TITLE_MAX} characters` });

  const run = await Run.create({ user_id: req.user.id, game_id, version: versionInfo.id, title: name });
  res.status(201).json(serializeRun(run, []));
};

// GET one run with its caught list (owner, or anyone if public)
export const getRun = async (req, res) => {
  const owner = await User.findByPk(req.run.user_id, { attributes: ["username"] });
  const caught = await caughtIdsOf(req.run.id);
  res.json(serializeRun(req.run, caught, {
    caught,
    owner: owner?.username ?? null,
    is_owner: req.isOwner,
  }));
};

// PATCH title, current section, status or visibility
export const updateRun = async (req, res) => {
  const { title, current_section, status, is_public } = req.body ?? {};
  const guide = getGuide(req.run.game_id);

  if (title !== undefined) {
    const trimmed = String(title).trim();
    if (!trimmed || trimmed.length > TITLE_MAX) {
      return res.status(400).json({ error: `Title must be 1-${TITLE_MAX} characters` });
    }
    req.run.title = trimmed;
  }
  if (current_section !== undefined) {
    if (!Number.isInteger(current_section) || current_section < 0 || current_section >= guide.sections.length) {
      return res.status(400).json({ error: `current_section must be 0-${guide.sections.length - 1}` });
    }
    req.run.current_section = current_section;
  }
  if (status !== undefined) {
    if (!RUN_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${RUN_STATUSES.join(", ")}` });
    }
    req.run.status = status;
  }
  if (is_public !== undefined) {
    if (typeof is_public !== "boolean") return res.status(400).json({ error: "is_public must be a boolean" });
    req.run.is_public = is_public;
  }
  await req.run.save();
  res.json(serializeRun(req.run, await caughtIdsOf(req.run.id)));
};

// DELETE a run and its catches
export const deleteRun = async (req, res) => {
  await req.run.destroy();
  res.json({ message: "Run deleted" });
};

const unknownEntries = (run, ids) => {
  const { entryIds } = guideIndex(getGuide(run.game_id));
  return ids.filter((id) => typeof id !== "string" || !entryIds.has(id));
};

// PUT the selected values for one choice block (starter, fossil, Moon Stones...). Empty list clears it.
export const setChoice = async (req, res) => {
  const { key } = req.params;
  const { values } = req.body ?? {};
  const def = guideIndex(getGuide(req.run.game_id)).choices.get(key);
  if (!def) return res.status(400).json({ error: `Unknown choice ${key}` });
  if (!Array.isArray(values) || values.some((v) => !def.values.has(v)) || new Set(values).size !== values.length) {
    return res.status(400).json({ error: `values must be distinct options of ${key}` });
  }
  if (values.length > def.cap) return res.status(400).json({ error: `Choose at most ${def.cap} for ${key}` });

  const choices = { ...(req.run.choices ?? {}) };
  if (values.length) choices[key] = values;
  else delete choices[key];
  req.run.choices = choices;
  await req.run.save();
  res.json(serializeRun(req.run, await caughtIdsOf(req.run.id)));
};

// PUT mark one Pokemon caught (idempotent)
export const markCaught = async (req, res) => {
  const { pokemon_id } = req.params;
  if (unknownEntries(req.run, [pokemon_id]).length) {
    return res.status(400).json({ error: `${pokemon_id} is not in this game's guide` });
  }
  await Caught.findOrCreate({ where: { run_id: req.run.id, pokemon_id } });
  req.run.changed("updatedAt", true);
  await req.run.save();
  res.json({ pokemon_id, caught: true });
};

// DELETE unmark one Pokemon (idempotent)
export const unmarkCaught = async (req, res) => {
  const { pokemon_id } = req.params;
  await Caught.destroy({ where: { run_id: req.run.id, pokemon_id } });
  req.run.changed("updatedAt", true);
  await req.run.save();
  res.json({ pokemon_id, caught: false });
};

// PATCH bulk add/remove, e.g. "mark section complete"
export const bulkCaught = async (req, res) => {
  const { add = [], remove = [] } = req.body ?? {};
  if (!Array.isArray(add) || !Array.isArray(remove)) {
    return res.status(400).json({ error: "add and remove must be arrays" });
  }
  const bad = unknownEntries(req.run, add);
  if (bad.length) return res.status(400).json({ error: `Not in this game's guide: ${bad.join(", ")}` });

  await sequelize.transaction(async (transaction) => {
    await Caught.bulkCreate(
      [...new Set(add)].map((pokemon_id) => ({ run_id: req.run.id, pokemon_id })),
      { ignoreDuplicates: true, transaction },
    );
    if (remove.length) {
      await Caught.destroy({ where: { run_id: req.run.id, pokemon_id: remove }, transaction });
    }
    req.run.changed("updatedAt", true);
    await req.run.save({ transaction });
  });
  res.json({ caught: await caughtIdsOf(req.run.id) });
};
