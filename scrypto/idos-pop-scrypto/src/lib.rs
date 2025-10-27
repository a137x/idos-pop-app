use scrypto::prelude::*;

#[derive(ScryptoSbor)]
pub struct ProofOfPersonInfo {
    pub credential_id: String,
    pub issuer_id: String,
}

#[derive(ScryptoSbor, NonFungibleData)]
pub struct ProofOfPerson {
    #[mutable]
    pub credential_id: String,
    #[mutable]
    pub issuer_id: String,
    #[mutable]
    pub time_last_verified: Instant,
    #[mutable]
    pub key_image_url: Url,
}

#[blueprint]
#[types(ProofOfPerson, String, Instant)]

mod proof_of_person_issuer {
    enable_method_auth! {
        methods {
            issue_pop => restrict_to: [OWNER];
            change_pop => restrict_to: [OWNER];
            mint_controller_badge => restrict_to: [OWNER];
            update_key_image_url => restrict_to: [OWNER];
            withdraw_from_locker => PUBLIC;
            get_pop_data => PUBLIC;
        }
    }

    struct ProofOfPersonIssuer {
        controller_badge_manager: FungibleResourceManager,
        pop_manager: NonFungibleResourceManager,
        account_locker: Global<AccountLocker>,
        key_image_url: Url,
    }

    impl ProofOfPersonIssuer {
        pub fn instantiate(
            dapp_def_address: GlobalAddress,
            key_image_url: Url,
            icon_url: Url,
        ) -> (Global<ProofOfPersonIssuer>, Bucket) {
            let (address_reservation, component_address) =
                Runtime::allocate_component_address(ProofOfPersonIssuer::blueprint_id());

            // Create controller badge resource
            let controller_badges: FungibleBucket = ResourceBuilder::new_fungible(
                OwnerRole::Fixed(rule!(require(global_caller(component_address)))),
            )
            .divisibility(DIVISIBILITY_MAXIMUM)
            .metadata(metadata! (
                init {
                    "name" => "Admin badge idOS Proof-of-Personhood", locked;
                    "symbol" => "ctrlPOP", locked;
                }
            ))
            .mint_roles(mint_roles!(
                minter => rule!(require(global_caller(component_address)));
                minter_updater => rule!(deny_all);
            ))
            .mint_initial_supply(5);

            // Create account locker
            let account_locker = Blueprint::<AccountLocker>::instantiate(
                OwnerRole::Fixed(rule!(require_amount(
                    Decimal::ONE,
                    controller_badges.resource_address()
                ))),
                rule!(
                    require_amount(Decimal::ONE, controller_badges.resource_address())
                        || require(global_caller(component_address))
                ),
                rule!(
                    require_amount(Decimal::ONE, controller_badges.resource_address())
                        || require(global_caller(component_address))
                ),
                rule!(
                    require_amount(Decimal::ONE, controller_badges.resource_address())
                        || require(global_caller(component_address))
                ),
                rule!(
                    require_amount(Decimal::ONE, controller_badges.resource_address())
                        || require(global_caller(component_address))
                ),
                None,
            );

            let pop_manager: NonFungibleResourceManager =
                ResourceBuilder::new_string_non_fungible_with_registered_type::<ProofOfPerson>(OwnerRole::Fixed(rule!(
                    require_amount(Decimal::ONE, controller_badges.resource_address())
                )))
                .metadata(metadata!(
                    init {
                        "name" => "idOS Proof-of-Personhood", locked;
                        "symbol" => "POP", locked;
                        "description" => "Ah, a fellow human! This is a Proof-of-Personhood badge.", locked;
                        "dapp_definitions" => vec![dapp_def_address.clone()], updatable;
                        "icon_url" => icon_url, updatable;
                    }
                ))
                .non_fungible_data_update_roles(non_fungible_data_update_roles!(
                    non_fungible_data_updater => rule!(require(global_caller(component_address))
                        || require_amount(
                            Decimal::ONE,
                            controller_badges.resource_address()
                        ));
                    non_fungible_data_updater_updater => rule!(require_amount(
                        Decimal::ONE,
                        controller_badges.resource_address()
                    ));
                ))
                .mint_roles(mint_roles!(
                    minter => rule!(require(global_caller(component_address))
                    || require_amount(
                        Decimal::ONE,
                        controller_badges.resource_address()
                    ));
                    minter_updater => rule!(require_amount(
                        Decimal::ONE,
                        controller_badges.resource_address()
                    ));
                ))
                .burn_roles(burn_roles!(
                    burner => rule!(require(global_caller(component_address))
                    || require_amount(
                        Decimal::ONE,
                        controller_badges.resource_address()
                    ));
                    burner_updater => rule!(require_amount(
                        Decimal::ONE,
                        controller_badges.resource_address()
                    ));
                ))
                .recall_roles(recall_roles!(
                    recaller => rule!(require(global_caller(component_address))
                    || require_amount(
                        Decimal::ONE,
                        controller_badges.resource_address()
                    ));
                    recaller_updater => rule!(require_amount(
                        Decimal::ONE,
                        controller_badges.resource_address()
                    ));
                ))
                .withdraw_roles(withdraw_roles!(
                    withdrawer => rule!(require(global_caller(component_address))
                    || require(global_caller(account_locker.address()))
                    || require_amount(
                        Decimal::ONE,
                        controller_badges.resource_address()
                    ));
                    withdrawer_updater => rule!(require_amount(
                        Decimal::ONE,
                        controller_badges.resource_address()
                    ));
                ))
                .create_with_no_initial_supply();

            // Instantiate component and globalize it
            let component = Self {
                controller_badge_manager: FungibleResourceManager::from(
                    controller_badges.resource_address(),
                ),
                pop_manager,
                account_locker,
                key_image_url,
            }
            .instantiate()
            .prepare_to_globalize(OwnerRole::Fixed(rule!(require(
                controller_badges.resource_address()
            ))))
            .with_address(address_reservation)
            .metadata(metadata! {
                init {
                    "name" => "idOS Proof-of-Personhood Issuer".to_string(), updatable;
                    "dapp_definition" => dapp_def_address, updatable;
                }
            })
            .globalize();

            (component, controller_badges.into())
        }

        pub fn issue_pop(&mut self, pop_data: ProofOfPersonInfo, account: Global<Account>) {
            let nft_data = ProofOfPerson {
                credential_id: pop_data.credential_id.clone(),
                issuer_id: pop_data.issuer_id,
                time_last_verified: Clock::current_time_rounded_to_seconds(),
                key_image_url: self.key_image_url.clone(),
            };

            let credential_id_replaced_hyphens = pop_data.credential_id.replace("-", "_");

            // Mint the NFT
            let pop_nft = self.pop_manager.mint_non_fungible(
                &NonFungibleLocalId::string(credential_id_replaced_hyphens).unwrap(),
                nft_data,
            );

            // Store in account locker
            self.account_locker.store(account, pop_nft.into(), true);
        }

        // We won't use this in prod, it's future proofing.
        // On the back-end, we will check if the user allows deposits, so all NFTs will be immediately sent to users
        // If we in the future want to allow them to claim from locker, we can use this.
        pub fn withdraw_from_locker(
            &mut self,
            account: Global<Account>,
            pop_id: NonFungibleLocalId,
        ) -> Bucket {
            Runtime::assert_access_rule(account.get_owner_role().rule);

            // Withdraw from locker
            self.account_locker
                .recover_non_fungibles(account, self.pop_manager.address(), vec![pop_id])
                .into()
        }

        pub fn change_pop(
            &mut self,
            nft_id: NonFungibleLocalId,
            new_data: ProofOfPersonInfo,
            update_time: bool,
            update_key_image_url: Option<Url>,
        ) {
            self.pop_manager.update_non_fungible_data(
                &nft_id,
                "credential_id",
                new_data.credential_id,
            );
            self.pop_manager
                .update_non_fungible_data(&nft_id, "issuer_id", new_data.issuer_id);
            if update_time {
                self.pop_manager.update_non_fungible_data(
                    &nft_id,
                    "time_last_verified",
                    Clock::current_time_rounded_to_seconds(),
                );
            }
            if let Some(key_image_url) = update_key_image_url {
                self.pop_manager
                    .update_non_fungible_data(&nft_id, "key_image_url", key_image_url);
            }
        }

        pub fn update_key_image_url(&mut self, new_key_image_url: Url) {
            self.key_image_url = new_key_image_url;
        }

        pub fn mint_controller_badge(&mut self, amount: Decimal) -> Bucket {
            self.controller_badge_manager.mint(amount).into()
        }

        pub fn get_pop_data(&self, pop_id: NonFungibleLocalId) -> ProofOfPerson {
            self.pop_manager.get_non_fungible_data(&pop_id)
        }
    }
}
