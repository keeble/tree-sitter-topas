/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PRECEDENCE = {
  exponentiation: 5,
  unary: 4,
  multiplicative: 3,
  additive: 2,
  comparative: 1,
};

const atoms = require('./grammar/atoms.js');

module.exports = grammar({
  name: 'topas',

  extras: $ => [
    /\s|\n/,
    $.line_comment,
    $.block_comment,
  ],

  rules: {
    source_file: $ => repeat(choice($.macro_invocation, $._Ttop, $.definition, $._literal, $._global_preprocessor_directive)),

    line_comment: $ => /'.*/,

    block_comment: $ => seq(
      '/*',
      repeat(/./),
      '*/',
    ),

    _literal: $ => choice($.string_literal, $.integer_literal, $.float_literal),

    string_literal: $ => /".*"/, // Anything between quote marks e.g., "a word"

    site_name_string: $ => /\S+/,

    site_query_string: $ => token(choice(
      seq(optional(/\S+/), '*'),
      seq('"', repeat(seq(optional('!'), /\S+/, optional('*'))), '"'),
    )),

    ...atoms,

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

    refined_parameter: $ => prec.left(seq(
      '@',
      optional($.identifier), // Parameter name, ignored internally
      optional(choice($.integer_literal, $.float_literal)), // Initial value
    )),

    unrefined_parameter: $ => prec.left(seq('!', optional(choice($.identifier, $._literal)))),

    _refineable_value_expression: $ => choice(
      $.simple_assignment,
      refineable(seq(optional($.identifier), $._literal)),
    ),

    _fixed_value_expression: $ => choice(
      $.simple_assignment,
      seq(optional($.identifier), $._literal),
    ),

    simple_assignment: $ => equation('=', $),

    compound_assignment: $ => equation(choice('+=', '-=', '*=', '/=', '^='), $),

    // ------ Expressions ------- //

    _expression: $ => choice(
      $._closed_expression,
      $.unary_expression,
      $.binary_expression,
    ),

    _closed_expression: $ => choice(
      prec(1, $.identifier),
      $.macro_invocation,
      $.parenthesised_expression,
      $._literal,
    ),

    _exponentiation: $ => prec.left(PRECEDENCE.exponentiation, seq(
      field('left', choice(
        $._closed_expression,
        alias($._exponentiation, $.binary_expression),
      )),
      field('operator', '^'),
      field('right', $._expression),
    )),

    binary_expression: $ => choice(

      $._exponentiation,

      prec.left(PRECEDENCE.multiplicative, seq(
        field('left', $._expression),
        field('operator', choice('*', '/', '%')),
        field('right', $._expression),
      )),

      prec.left(PRECEDENCE.multiplicative, seq(
        field('left', $._expression),
        field('right', choice(
          $._closed_expression,
          alias($._exponentiation, $.binary_expression),
        )),
      )),

      prec.left(PRECEDENCE.additive, seq(
        field('left', $._expression),
        field('operator', choice('+', '-')),
        field('right', $._expression),
      )),

      prec.left(PRECEDENCE.comparative, seq(
        field('left', $._expression),
        field('operator', choice('==', '<', '>', '<=', '>=')),
        field('right', $._expression),
      )),
    ),

    unary_expression: $ => prec.right(PRECEDENCE.unary, seq(
      field('operator', choice('+', '-')),
      field('argument', choice(
        $.identifier,
        $.parenthesised_expression,
        $.float_literal,
        $.integer_literal,
        alias($._exponentiation, $.binary_expression),
      )),
    )),

    parenthesised_expression: $ => seq(
      '(',
      $._expression,
      ')',
    ),

    _block_item: $ => prec.right(choice(
      $.definition,
      $._global_preprocessor_directive,
      $._Ttop,
      $._expression,
      $.refined_parameter,
      $.unrefined_parameter,
      $.simple_assignment,
      $.compound_assignment,
    )),

    // ------- Preprocessor -------- //

    parameter_list: $ => seq(
      token.immediate('('),
      optional('&'),
      optional($.identifier),
      repeat(seq(',', optional('&'), optional($.identifier))),
      ')',
    ),

    macro_declaration: $ => seq(
      token('macro'),
      optional('&'),
      field('name', $.identifier),
      field('parameters', optional($.parameter_list)),
      field('body', seq(
        '{',
        repeat(choice($._block_item, $._macro_preprocessor_directive)),
        '}',
      )),
    ),

    _global_preprocessor_directive: $ => choice(
      $.macro_declaration,
      $.preprocessor_include,
      $.preprocessor_delete,
      $.preprocessor_define,
      $.preprocessor_call,
      $.preprocessor_if_statement,
      $.preprocessor_variable_declaration,
      $.preprocessor_output,
      $.macro_list,
    ),

    preprocessor_include: $ => seq(field('directive', '#include'), field('path', $.string_literal)),
    preprocessor_delete: $ => seq(field('directive', '#delete_macros'), field('arguments', seq('{', repeat($.identifier), '}'))),
    preprocessor_define: $ => seq(field('directive', choice('#define', '#undef')), field('argument', $.identifier)),
    preprocessor_call: $ => field('directive', '#seed'),

    preprocessor_if_statement: $ => seq(
      choice(
        $._preproc_if,
        $._preproc_ifdef,
        $._preproc_ifndef,
      ),
      repeat($._preproc_elseif),
      optional($._preproc_else),
      field('directive', '#endif'),
    ),

    _preproc_if: $ => seq(
      field('directive', '#if'),
      optional('='),
      field('condition', $._expression),
      ';',
      optional(repeat($._block_item)),
    ),

    _preproc_ifdef: $ => seq(
      field('directive', '#ifdef'),
      optional('!'),
      field('argument', $.identifier),
      optional(repeat($._block_item)),
    ),

    _preproc_ifndef: $ => seq(
      field('directive', '#ifndef'),
      field('argument', $.identifier),
      optional(repeat($._block_item)),
    ),

    _preproc_elseif: $ => seq(
      field('directive', '#elseif'),
      optional('='),
      field('condition', $._expression),
      ';',
      optional(repeat($._block_item)),
    ),

    _preproc_else: $ => seq(
      field('directive', '#else'),
      optional(repeat($._block_item)),
    ),

    macro_list: $ => seq(
      field('directive', '#list'),
      repeat1(seq(
        optional('&'),
        field('name', $.identifier),
        field('parameters', optional($.parameter_list)),
      )),
      field('body', seq(
        '{',
        repeat(choice(
          $._literal,
          $.identifier,
          $.refined_parameter,
          $.unrefined_parameter,
          $.delimited_block,
        )),
        '}',
      )),
    ),

    delimited_block: $ => seq(
      '{',
      repeat(choice(
        $._block_item,
        $._macro_preprocessor_directive,
      )),
      '}',
    ),

    preprocessor_variable_declaration: $ => seq(
      field('directive', '#prm'),
      field('name', $.identifier),
      field('value', $.simple_assignment),
    ),

    preprocessor_output: $ => seq(
      field('directive', '#out'),
      field('argument', $.identifier),
    ),

    _macro_preprocessor_directive: $ => choice(
      $.macro_if_statement,
      $.macro_operator_directive,
      alias($._macro_unique, $.macro_operator_directive),
      $.macro_parameter_output,
    ),

    macro_if_statement: $ => seq(
      choice(
        $._m_if,
        $._m_ifarg,
      ),
      repeat($._m_elseif),
      optional($._m_else),
      field('directive', '#m_endif'),
    ),

    _m_if: $ => seq(
      field('directive', '#m_if'),
      field('argument', $.binary_expression),
      ';',
      optional(repeat($._block_item)),
    ),

    _m_elseif: $ => seq(
      field('directive', '#m_elseif'),
      field('argument', $.binary_expression),
      ';',
      optional(repeat($._block_item)),
    ),

    _m_ifarg: $ => seq(
      field('directive', '#m_ifarg'),
      field('argument', $.identifier),
      choice(
        field('directive', choice('#m_code', '#_eqn', '#m_code_refine', '#m_one_word')),
        $.string_literal,
      ),
      optional(repeat($._block_item)),
    ),

    _m_else: $ => seq(
      field('directive', '#m_else'),
      optional(repeat($._block_item)),
    ),

    macro_operator_directive: $ => choice(
      field('directive', choice('#m_argu', '#m_first_word', '#m_unique_not_refine')),
      field('argument', $.identifier),
    ),

    _macro_unique: $ => field('directive', '#m_unique'),

    macro_parameter_output: $ => seq(
      field('directive', '#m_out'),
      field('argument', $.identifier),
    ),

    // ------- Keywords -------- //

    _Ttop: $ => choice(
      $._Tcomm_2,
      $._Tstr_details, // At top-level temporarily for test purposes, until [str] keyword is added
    ),

    _Tcomm_2: $ => choice(
      $.variable_declaration,
      $.variable_assignment,
    ),

    _Tstr_details: $ => choice(
      $.site_declaration,
    ),

    _Tmin_r_max_r: $ => choice(
      simple_keyword('min_r', $, false),
      simple_keyword('max_r', $, false),
    ),

    variable_declaration: $ => seq(
      field('keyword', choice('prm', 'local')),
      field('name', refineable($.identifier)),
      field('value', choice($._literal, $.simple_assignment)),
    ),

    variable_assignment: $ => seq(
      field('keyword', 'existing_prm'),
      field('name', refineable($.identifier)),
      field('value', choice(
        $.simple_assignment,
        $.compound_assignment,
      )),
    ),

    /*

    [site [x][y][z]]...
      [occ [beq][scale_occ]]...
      [num_posns][rand_xyz][inter]
      [adps][u11][u22][u33][u12][u13][u23]

    */

    site_declaration: $ => prec.right(seq(
      field('keyword', 'site'),
      field('name', $.site_name_string),
      repeat(choice(
        alias($._site_nested_keyword, $.keyword_statement),
        alias($._Tmin_r_max_r, $.keyword_statement),
        $._global_preprocessor_directive,
        prec(-1, $.macro_invocation),
      )),
    )),

    _site_nested_keyword: $ => choice(
      simple_keyword(/[xyz]/, $),
      $._occ_keyword_statement,
      simple_keyword('num_posns', $),
      simple_keyword('rand_xyz', $, false),
      simple_keyword('inter', $, false),
      choice(
        field('keyword', 'adps'),
        prec.right(repeat1(simple_keyword(/u(1[123]|2[23]|33)/, $))),
      ),
    ),

    _occ_keyword_statement: $ => seq(
      field('keyword', 'occ'),
      $.atom,
      $._refineable_value_expression,
      repeat(alias($._occ_nested_keyword, $.keyword_statement)),
    ),

    _occ_nested_keyword: $ => choice(
      simple_keyword('beq', $),
      simple_keyword('scale_occ', $),
    ),

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
      'lor_fwhm',
      'lpsd_beam_spill_correct_intensity',
      'lpsd_equitorial_divergence_degrees',
      'lpsd_equitorial_sample_length_mm',
      'lpsd_th2_angular_range_degrees',
      'lp_search',
      'm1',
      'm2',
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
      'num_runs',
      'num_unique_vx_vy',
      'n_avg',
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


/**
 * Creates a rule to optionally allow or disallow refinement of a rule
 *
 * @param {Rule} rule
 *
 * @returns {ChoiceRule}
 */
function refineable(rule) {
  return choice(
    seq(optional(choice('@', '!')), rule),
    prec(-1, '@'),
  );
}

/**
 * Creates a rule for the TOPAS equation structure
 *
 * @param {Rule | string} operator
 *
 * @param {GrammarSymbols<string>} $
 *
 * @returns {SeqRule}
 */
function equation(operator, $) {
  return seq(
    field('operator', operator),
    field('body', $._expression),
    ';',
    optional(seq(':', choice($.float_literal, $.integer_literal, $.identifier))),
  );
}

/**
 * Creates a rule for the structure of simple keywords i.e. those that take
 * only an equation or value and have no nested keywords beneath them. Refinement
 * symbols are allowed by default but can be disallowed using third argument.
 *
 * @param {string | RegExp} keyword
 * @param {GrammarSymbols<string>} $
 * @param {boolean} refine
 * @returns {SeqRule}
 */
function simple_keyword(keyword, $, refine=true) {
  if (refine) {
    return seq(
      field('keyword', token(prec(1, keyword))),
      field('value', $._refineable_value_expression),
    );
  } else {
    return seq(
      field('keyword', token(prec(1, keyword))),
      field('value', $._fixed_value_expression),
    );
  }
}
