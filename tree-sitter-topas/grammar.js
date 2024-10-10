/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PRECEDENCE = {
  exponentiation: 5,
  unary: 4,
  multiplicative: 3,
  additive: 2,
  comparative: 1,
};

module.exports = grammar({
  name: 'topas',

  rules: {
    source_file: $ => repeat(choice($.comment, $.macro_invocation, $.equation, $.definition, $._literal)),

    comment: $ => choice($.line_comment, $.block_comment),

    line_comment: $ => /'.*/,

    block_comment: $ => seq(
      '/*',
      repeat(/./),
      '*/',
    ),

    _literal: $ => choice($.string_literal, $.integer_literal, $.float_literal),

    string_literal: $ => /".*"/, // Anything between quote marks e.g., "a word"

    integer_literal: $ => /-?\d+/,

    float_literal: $ => choice(
      /-?\d*\.\d+/, // Ordinary floats e.g., 1.23
      /-?\d+(\.\d+)?(e|E)-?\d+(\.\d+)?/, // Scientific notation e.g., 1.3e4 or 2e5.5
    ),

    macro_invocation: $ => seq(
      field('name', $.identifier),
      field('arguments', prec(1, optional($.argument_list))),
    ),

    identifier: $ => /[A-Za-z]\w*/, // Initial letter character, then any alpha-numeric or underscore characters are permitted

    _argument: $ => choice(
      $.refined_parameter,
      $.unrefined_parameter,
      $._expression,
    ),

    argument_list: $ => seq(
      token.immediate('('),
      optional($._argument),
      repeat(seq(',', optional($._argument))), // N.B. Empty arguments *are* permitted
      ')',
    ),

    refined_parameter: $ => seq(
      '@',
      optional($.identifier), // Parameter name, ignored internally
      optional(choice($.integer_literal, $.float_literal)), // Initial value
    ),

    unrefined_parameter: $ => seq('!', optional(choice($.identifier, $._literal))),

    equation: $ => choice(
      seq(
        field('left', $.definition), // Keyword equations
        '=',
        field('right', $._expression),
        ';',
        optional(seq(':', choice($.float_literal, $.integer_literal, $.identifier)))),
      seq(
        field('left', choice($.identifier, $.refined_parameter, $.unrefined_parameter)), // Variable assignment equations
        choice('=', '+=', '-=', '*=', '/=', '^='),
        field('right', $._expression),
        ';',
        optional(seq(':', choice($.float_literal, $.integer_literal, $.identifier)))),
    ),

    _expression: $ => choice(
      prec(1, $.identifier), // Prioritised to prevent macros being identified as identifier * parenthesised expression
      $.macro_invocation,
      $.parenthesised_expression,
      $.unary_expression,
      $.binary_expression,
      $._literal,
    ),

    parenthesised_expression: $ => seq(
      '(',
      $._expression,
      ')',
    ),

    binary_expression: $ => {
      const table = [
        {precedence: PRECEDENCE.comparative, operator: $._comparative},
        {precedence: PRECEDENCE.additive, operator: $._additive},
        {precedence: PRECEDENCE.multiplicative, operator: optional($._multiplicative)},
        {precedence: PRECEDENCE.exponentiation, operator: $._exponentiation},
      ];


      return choice(...table.map(({precedence, operator}) => prec.left(precedence, seq(
        field('left', $._expression),

        field('operator', operator),
        field('right', $._expression),
      ))));
    },

    _comparative: $ => choice('==', '<=', '>=', '<', '>'),
    _additive: $ => choice('+', '-'),
    _multiplicative: $ => choice('*', '/', '%'),
    _exponentiation: $ => '^',

    unary_expression: $ => prec(PRECEDENCE.unary, seq(
      '-',
      field('argument', $._expression),
    )),

    definition: $ => choice(
      'a',
      'aberration_range_change_allowed',
      'accumulate_phases_and_save_to_file',
      'accumulate_phases_when',
      'activate',
      'add_pop_1st_2nd_peak',
      'add_to_cloud_N',
      'add_to_cloud_when',
      'add_to_phases_of_weak_reflections',
      'adps',
      'ai_anti_bump',
      'ai_closest_N',
      'ai_exclude_eq_0',
      'ai_flatten_with_tollerance_of',
      'ai_no_self_interation',
      'ai_only_eq_0',
      'ai_radius',
      'ai_sites_1',
      'ai_sites_2',
      'al',
      'amorphous_area',
      'amorphous_phase',
      'append_bond_lengths',
      'append_cartesian',
      'append_fractional',
      'apply_exp_scale',
      'approximate_A',
      'atomic_interaction',
      'atom_out',
      'auto_scale',
      'auto_sparse_CG',
      'axial_conv',
      'axial_del',
      'axial_n_beta',
      'a_add',
      'A_matrix',
      'A_matrix_normalized',
      'A_matrix_prm_filter',
      'b',
      'be',
      'beq',
      'bkg',
      'bootstrap_errors',
      'box_interaction',
      'break_cycle_if_true',
      'brindley_spherical_r_cm',
      'bring_2nd_peak_to_top',
      'broaden_peaks',
      'b_add',
      'c',
      'calculate_Lam',
      'capillary_diameter_mm',
      'capillary_divergent_beam',
      'capillary_parallel_beam',
      'capillary_u_cm_inv',
      'cell_mass',
      'cell_volume',
      'cf_hkl_file',
      'cf_in_A_matrix',
      'charge_flipping',
      'chi2',
      'chi2_convergence_criteria',
      'chk_for_best',
      'choose_from',
      'choose_randomly',
      'choose_to',
      'circles_conv',
      'cloud',
      'cloud',
      'cloud_atomic_separation',
      'cloud_atomic_separation',
      'cloud_extract_and_save_xyzs',
      'cloud_fit',
      'cloud_formation_omit_rwps',
      'cloud_gauss_fwhm',
      'cloud_gauss_fwhm',
      'cloud_I',
      'cloud_load',
      'cloud_load_fixed_starting',
      'cloud_load_xyzs',
      'cloud_load_xyzs',
      'cloud_load_xyzs_omit_rwps',
      'cloud_match_gauss_fwhm',
      'cloud_min_intensity',
      'cloud_number_to_extract',
      'cloud_N_to_extract',
      'cloud_population',
      'cloud_population',
      'cloud_pre_randimize_add_to',
      'cloud_save',
      'cloud_save',
      'cloud_save_match_xy',
      'cloud_save_processed_xyzs',
      'cloud_save_xyzs',
      'cloud_save_xyzs',
      'cloud_stay_within',
      'cloud_try_accept',
      'conserve_memory',
      'consider_lattice_parameters',
      'continue_after_convergence',
      'convolute_X_recal',
      'convolution_step',
      'corrected_weight_percent',
      'correct_for_atomic_scattering_factors',
      'correct_for_temperature_effects',
      'crystalline_area',
      'current_peak_max_x',
      'current_peak_min_x',
      'C_matrix',
      'C_matrix_normalized',
      'd',
      'def',
      'default_I_attributes',
      'degree_of_crystallinity',
      'del',
      'delete_observed_reflections',
      'del_approx',
      'determine_values_from_samples',
      'displace',
      'dont_merge_equivalent_reflections',
      'dont_merge_Friedel_pairs',
      'do_errors',
      'do_errors_include_penalties',
      'do_errors_include_restraints',
      'dummy',
      'dummy_str',
      'd_Is',
      'elemental_composition',
      'element_weight_percent',
      'element_weight_percent_known',
      'exclude',
      'existing_prm',
      'exp_conv_const',
      'exp_limit',
      'extend_calculated_sphere_to',
      'extra_X',
      'extra_X_left',
      'extra_X_right',
      'f0',
      'f0_f1_f11_atom',
      'f11',
      'f1',
      'filament_length',
      'file_out',
      'find_origin',
      'finish_X',
      'fit_obj',
      'fit_obj_phase',
      'Flack',
      'flat_crystal_pre_monochromator_axial_const',
      'flip_equation',
      'flip_neutron',
      'flip_regime_2',
      'flip_regime_3',
      'fn',
      'fourier_map',
      'fourier_map_formula',
      'fo_transform_X',
      'fraction_density_to_flip',
      'fraction_of_yobs_to_resample',
      'fraction_reflections_weak',
      'ft_conv',
      'ft_convolution',
      'ft_L_max',
      'ft_min',
      'ft_x_axis_range',
      'fullprof_format',
      'f_atom_quantity',
      'f_atom_type',
      'ga',
      'gauss_fwhm',
      'generate_name_append',
      'generate_stack_sequences',
      'generate_these',
      'gof',
      'grs_interaction',
      'gsas_format',
      'gui_add_bkg',
      'h1',
      'h2',
      'half_hat',
      'hat',
      'hat_height',
      'height',
      'histogram_match_scale_fwhm',
      'hklis',
      'hkl_Is',
      'hkl_m_d_th2',
      'hkl_Re_Im',
      'hm_covalent_fwhm',
      'hm_size_limit_in_fwhm',
      'I',
      'ignore_differences_in_Friedel_pairs',
      'index_d',
      'index_exclude_max_on_min_lp_less_than',
      'index_I',
      'index_lam',
      'index_max_lp',
      'index_max_Nc_on_No',
      'index_max_number_of_solutions',
      'index_max_th2_error',
      'index_max_zero_error',
      'index_min_lp',
      'index_th2',
      'index_th2_resolution',
      'index_x0',
      'index_zero_error',
      'insert',
      'inter',
      'in_cartesian',
      'in_FC',
      'in_str_format',
      'iters',
      'i_on_error_ratio_tolerance',
      'I_parameter_names_have_hkl',
      'la',
      'Lam',
      'lam',
      'layer',
      'layers_tol',
      'lebail',
      'lg',
      'lh',
      'line_min',
      'lo',
      'load',
      'local',
      'lor_fwhm',
      'lpsd_beam_spill_correct_intensity',
      'lpsd_equitorial_divergence_degrees',
      'lpsd_equitorial_sample_length_mm',
      'lpsd_th2_angular_range_degrees',
      'lp_search',
      'm1',
      'm2',
      'macro',
      'mag_atom_out',
      'mag_only',
      'mag_only_for_mag_sites',
      'mag_space_group',
      'marquardt_constant',
      'match_transition_matrix_stats',
      'max',
      'max_r',
      'max_X',
      'mg',
      'min',
      'min_d',
      'min_grid_spacing',
      'min_r',
      'min_X',
      'mixture_density_g_on_cm3',
      'mixture_MAC',
      'mlx',
      'mly',
      'mlz',
      'modify_initial_phases',
      'modify_peak',
      'modify_peak_apply_before_convolutions',
      'modify_peak_eqn',
      'more_accurate_Voigt',
      'move_to',
      'move_to_the_next_temperature_regardless_of_the_change_in_rwp',
      'n1',
      'n2',
      'n3',
      'n',
      'ndx_allp',
      'ndx_alp',
      'ndx_belp',
      'ndx_blp',
      'ndx_clp',
      'ndx_galp',
      'ndx_gof',
      'ndx_sg',
      'ndx_uni',
      'ndx_vol',
      'ndx_ze',
      'neutron_data',
      'normalize_FCs',
      'normals_plot',
      'normals_plot_min_d',
      'no_f11',
      'no_inline',
      'no_LIMIT_warnings',
      'no_normal_equations',
      'no_th_dependence',
      'number_of_sequences',
      'number_of_stacks_per_sequence',
      'numerical_area',
      'numerical_lor_gauss_conv',
      'numerical_lor_ymin_on_ymax',
      'num_hats',
      'num_highest_I_values_to_keep',
      'num_patterns_at_a_time',
      'num_posns',
      'num_runs',
      'num_unique_vx_vy',
      'n_avg',
      'occ',
      'occ_merge',
      'occ_merge_radius',
      'omit',
      'omit_hkls',
      'one_on_x_conv',
      'only_lps',
      'only_penalties',
      'on_best_goto',
      'on_best_rewind',
      'operate_on_points',
      'out',
      'out_A_matrix',
      'out_chi2',
      'out_dependences',
      'out_dependents_for',
      'out_eqn',
      'out_file',
      'out_fmt',
      'out_fmt_err',
      'out_prm_vals_dependents_filter',
      'out_prm_vals_filter',
      'out_prm_vals_on_convergence',
      'out_prm_vals_per_iteration',
      'out_record',
      'out_refinement_stats',
      'out_rwp',
      'pdf_convolute',
      'pdf_data',
      'pdf_for_pairs',
      'pdf_gauss_fwhm',
      'pdf_info',
      'pdf_only_eq_0',
      'pdf_scale_simple',
      'pdf_ymin_on_ymax',
      'pdf_zero',
      'peak_buffer_based_on',
      'peak_buffer_based_on_tol',
      'peak_buffer_step',
      'peak_type',
      'penalties_weighting_K1',
      'penalty',
      'pen_weight',
      'percent_zeros_before_sparse_A',
      'phase_MAC',
      'phase_name',
      'phase_out',
      'phase_penalties',
      'pick_atoms',
      'pick_atoms_when',
      'pk_xo',
      'point_for_site',
      'primary_soller_angle',
      'prm',
      'prm_with_error',
      'process_times',
      'pr_str',
      'push_peak',
      'pv_fwhm',
      'pv_lor',
      'qa',
      'qb',
      'qc',
      'quick_refine',
      'quick_refine_remove',
      'qx',
      'qy',
      'qz',
      'randomize_initial_phases_by',
      'randomize_on_errors',
      'randomize_phases_on_new_cycle_by',
      'rand_xyz',
      'range',
      'rebin_min_merge',
      'rebin_tollerance_in_Y',
      'rebin_with_dx_of',
      'recal_weighting_on_iter',
      'receiving_slit_length',
      'redo_hkls',
      'remove_phase',
      'report_on',
      'report_on_str',
      'resample_from_current_ycalc',
      'restraint',
      'return',
      'rigid',
      'rotate',
      'Rp',
      'Rs',
      'r_bragg',
      'r_exp',
      'r_exp_dash',
      'r_p',
      'r_p_dash',
      'r_wp',
      'r_wp_dash',
      'r_wp_normal',
      'sample_length',
      'save_best_chi2',
      'save_sequences',
      'save_sequences_as_strs',
      'save_values_as_best_after_randomization',
      'scale',
      'scale_Aij',
      'scale_density_below_threshold',
      'scale_E',
      'scale_F000',
      'scale_F',
      'scale_phases',
      'scale_phase_X',
      'scale_pks',
      'scale_top_peak',
      'scale_weak_reflections',
      'secondary_soller_angle',
      'seed',
      'set_initial_phases_to',
      'sh_alpha',
      'sh_Cij_prm',
      'sh_order',
      'site',
      'sites_angle',
      'sites_avg_rand_xyz',
      'sites_distance',
      'sites_flatten',
      'sites_geometry',
      'sites_rand_on_avg',
      'sites_rand_on_avg_distance_to_randomize',
      'sites_rand_on_avg_min_distance',
      'site_to_restrain',
      'siv_s1_s2',
      'smooth',
      'space_group',
      'sparse_A',
      'spherical_harmonics_hkl',
      'spiked_phase_measured_weight_percent',
      'spv_h1',
      'spv_h2',
      'spv_l1',
      'spv_l2',
      'stack',
      'stacked_hats_conv',
      'start_values_from_site',
      'start_X',
      'stop_when',
      'str',
      'strs',
      'str_hkl_angle',
      'str_hkl_smallest_angle',
      'str_mass',
      'str_mass',
      'sx',
      'sy',
      'symmetry_obey_0_to_1',
      'system_after_save_OUT',
      'system_before_save_OUT',
      'sz',
      'ta',
      'tag',
      'tag_2',
      'tangent_max_triplets_per_h',
      'tangent_min_triplets_per_h',
      'tangent_num_h_keep',
      'tangent_num_h_read',
      'tangent_num_k_read',
      'tangent_scale_difference_by',
      'tangent_tiny',
      'tb',
      'tc',
      'temperature',
      'test_a',
      'test_al',
      'test_b',
      'test_be',
      'test_c',
      'test_ga',
      'th2_offset',
      'to',
      'transition',
      'translate',
      'try_space_groups',
      'two_theta_calibration',
      'tx',
      'ty',
      'tz',
      'u11',
      'u12',
      'u13',
      'u22',
      'u23',
      'u33',
      'ua',
      'ub',
      'uc',
      'update',
      'user_defined_convolution',
      'user_threshold',
      'user_y',
      'use_best_values',
      'use_CG',
      'use_extrapolation',
      'use_Fc',
      'use_layer',
      'use_LU',
      'use_LU_for_errors',
      'use_tube_dispersion_coefficients',
      'ux',
      'uy',
      'uz',
      'v1',
      'val_on_continue',
      'verbose',
      'view_cloud',
      'view_structure',
      'volume',
      'weighted_Durbin_Watson',
      'weighting',
      'weighting_normal',
      'weight_percent',
      'weight_percent_amorphous',
      'whole_hat',
      'WPPM_correct_Is',
      'WPPM_ft_conv',
      'WPPM_L_max',
      'WPPM_th2_range',
      'x',
      'xdd',
      'xdds',
      'xdd_out',
      'xdd_scr',
      'xdd_sum',
      'xo',
      'xo_Is',
      'xye_format',
      'x_angle_scaler',
      'x_axis_to_energy_in_eV',
      'x_calculation_step',
      'x_scaler',
      'y',
      'yc_eqn',
      'ymin_on_ymax',
      'yobs_eqn',
      'yobs_to_xo_posn_yobs',
      'z',
      'z_add',
      'z_matrix',

    ),
  },
});

