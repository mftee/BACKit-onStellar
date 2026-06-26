//! Lightweight on-chain governance for CallRegistry parameter changes.
//!
//! Stakers with sufficient historical stake volume can propose parameter changes.
//! Voting power = user's historical stake volume (snapshot at proposal creation).
//! Proposals pass when votes_for > governance_quorum_bps of total platform stake.

use soroban_sdk::{contracttype, Address, Env, Map, Symbol, Vec};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct GovernanceProposal {
    pub id: u64,
    pub proposer: Address,
    pub parameter: Symbol,
    pub new_value_bytes: soroban_sdk::Bytes,
    pub voting_end_ledger: u32,
    pub votes_for: i128,
    pub votes_against: i128,
    pub executed: bool,
}

#[contracttype]
enum GovKey {
    ProposalCounter,
    Proposal(u64),
    Voted(u64, Address),
    GovernanceConfig,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct GovernanceConfig {
    /// Minimum stake volume required to create a proposal.
    pub proposal_threshold: i128,
    /// Percentage of total platform stake needed to pass (basis points).
    pub governance_quorum_bps: u32,
    /// How many ledgers a proposal stays open.
    pub voting_period_ledgers: u32,
}

impl GovernanceConfig {
    pub fn default() -> Self {
        GovernanceConfig {
            proposal_threshold: 1000_0000000, // 1000 XLM
            governance_quorum_bps: 100,        // 1%
            voting_period_ledgers: 17280,      // ~1 day at 5s/ledger
        }
    }
}

fn next_proposal_id(env: &Env) -> u64 {
    let id: u64 = env.storage().instance().get(&GovKey::ProposalCounter).unwrap_or(0);
    env.storage().instance().set(&GovKey::ProposalCounter, &(id + 1));
    id + 1
}

pub fn propose_change(
    env: &Env,
    proposer: Address,
    parameter: Symbol,
    new_value_bytes: soroban_sdk::Bytes,
    voting_end_ledger: u32,
    proposer_stake_volume: i128,
) -> u64 {
    proposer.require_auth();
    let cfg: GovernanceConfig = env
        .storage()
        .instance()
        .get(&GovKey::GovernanceConfig)
        .unwrap_or_else(GovernanceConfig::default);

    if proposer_stake_volume < cfg.proposal_threshold {
        panic!("insufficient stake volume to propose");
    }
    let current = env.ledger().sequence();
    if voting_end_ledger <= current {
        panic!("voting_end_ledger must be in the future");
    }

    let id = next_proposal_id(env);
    let proposal = GovernanceProposal {
        id,
        proposer: proposer.clone(),
        parameter: parameter.clone(),
        new_value_bytes,
        voting_end_ledger,
        votes_for: 0,
        votes_against: 0,
        executed: false,
    };
    env.storage().instance().set(&GovKey::Proposal(id), &proposal);
    env.events().publish(
        ("governance", "ProposalCreated"),
        (id, proposer, parameter, voting_end_ledger),
    );
    id
}

pub fn vote(env: &Env, voter: Address, proposal_id: u64, support: bool, voter_stake_volume: i128) {
    voter.require_auth();
    let voted_key = GovKey::Voted(proposal_id, voter.clone());
    if env.storage().instance().has(&voted_key) {
        panic!("already voted");
    }
    let mut proposal: GovernanceProposal = env
        .storage()
        .instance()
        .get(&GovKey::Proposal(proposal_id))
        .expect("proposal not found");

    if env.ledger().sequence() > proposal.voting_end_ledger {
        panic!("voting period ended");
    }

    if support {
        proposal.votes_for += voter_stake_volume;
    } else {
        proposal.votes_against += voter_stake_volume;
    }
    env.storage().instance().set(&GovKey::Proposal(proposal_id), &proposal);
    env.storage().instance().set(&voted_key, &true);
    env.events().publish(
        ("governance", "VoteCast"),
        (proposal_id, voter, support, voter_stake_volume),
    );
}

pub fn execute_proposal(
    env: &Env,
    proposal_id: u64,
    total_platform_stake: i128,
) -> GovernanceProposal {
    let mut proposal: GovernanceProposal = env
        .storage()
        .instance()
        .get(&GovKey::Proposal(proposal_id))
        .expect("proposal not found");

    if proposal.executed {
        panic!("already executed");
    }
    if env.ledger().sequence() <= proposal.voting_end_ledger {
        panic!("voting period not ended");
    }

    let cfg: GovernanceConfig = env
        .storage()
        .instance()
        .get(&GovKey::GovernanceConfig)
        .unwrap_or_else(GovernanceConfig::default);

    let quorum = total_platform_stake
        .checked_mul(cfg.governance_quorum_bps as i128)
        .unwrap_or(i128::MAX)
        / 10000;

    if proposal.votes_for > quorum {
        proposal.executed = true;
        env.storage().instance().set(&GovKey::Proposal(proposal_id), &proposal);
        env.events().publish(
            ("governance", "ProposalExecuted"),
            (proposal_id, proposal.parameter.clone()),
        );
    } else {
        env.events().publish(("governance", "ProposalRejected"), (proposal_id,));
        panic!("quorum not met");
    }
    proposal
}

pub fn get_proposal(env: &Env, proposal_id: u64) -> GovernanceProposal {
    env.storage()
        .instance()
        .get(&GovKey::Proposal(proposal_id))
        .expect("proposal not found")
}

pub fn get_active_proposals(env: &Env) -> Vec<GovernanceProposal> {
    let count: u64 = env
        .storage()
        .instance()
        .get(&GovKey::ProposalCounter)
        .unwrap_or(0);
    let current = env.ledger().sequence();
    let mut result = Vec::new(env);
    for id in 1..=count {
        if let Some(p) = env.storage().instance().get::<_, GovernanceProposal>(&GovKey::Proposal(id)) {
            if !p.executed && current <= p.voting_end_ledger {
                result.push_back(p);
            }
        }
    }
    result
}

pub fn set_governance_config(env: &Env, admin: &Address, cfg: GovernanceConfig) {
    admin.require_auth();
    env.storage().instance().set(&GovKey::GovernanceConfig, &cfg);
}
